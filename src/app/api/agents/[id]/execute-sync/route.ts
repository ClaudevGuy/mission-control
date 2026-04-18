import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireRole,
  getProjectId,
  apiResponse,
  apiError,
  ApiError,
  validateBody,
} from "@/lib/api-helpers";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { selectModel, getTierConfig, type Tier, type ProviderKey } from "@/lib/model-selector";
import { profileTask } from "@/lib/agent-profiler";
import { createNotification } from "@/lib/create-notification";
import { checkCostAnomaly } from "@/lib/cost-guard";
import { maybeDispatchShadow } from "@/lib/downshift/dispatcher";

const executeSchema = z.object({
  input: z.string().min(1, "Input is required"),
});

const PROVIDER_DEFAULT_MODEL: Record<string, string> = {
  CLAUDE: "claude-sonnet-4-6",
  GPT4: "gpt-4o",
  GEMINI: "gemini-2.0-flash",
};

// ── POST /api/agents/[id]/execute-sync ──
// Non-streaming execution for internal use (workflow runner).
// Returns a plain JSON response instead of SSE.

export const POST = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireRole("developer");
    const projectId = await getProjectId();
    const agentId = context?.params?.id;
    if (!agentId) return apiError("Agent ID is required", 400);

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, projectId },
    });
    if (!agent) throw new ApiError("Agent not found", 404);

    // Resolve linked Prompt Studio prompt
    let resolvedSystemPrompt = agent.systemPrompt || "";
    if (resolvedSystemPrompt.startsWith("__PROMPT_STUDIO__:")) {
      const promptId = resolvedSystemPrompt.replace("__PROMPT_STUDIO__:", "");
      const promptVersion = await prisma.promptVersion.findFirst({
        where: { id: promptId, projectId, isActive: true },
      });
      if (!promptVersion) {
        const byId = await prisma.promptVersion.findFirst({ where: { id: promptId, projectId } });
        if (byId) {
          const latest = await prisma.promptVersion.findFirst({
            where: { projectId, name: byId.name, isActive: true },
          });
          resolvedSystemPrompt = latest?.content || byId.content;
        }
      } else {
        resolvedSystemPrompt = promptVersion.content;
      }
    }

    // ── Resolve API key (DB-first, env-fallback, logs which source won) ──
    const providerNames: Record<string, string> = { CLAUDE: "Anthropic", GPT4: "OpenAI", GEMINI: "Google AI" };
    const envKeys: Record<string, string> = { CLAUDE: "ANTHROPIC_API_KEY", GPT4: "OPENAI_API_KEY", GEMINI: "GOOGLE_AI_API_KEY" };
    const providerName = providerNames[agent.model] || "Anthropic";
    const envVar = envKeys[agent.model] || "ANTHROPIC_API_KEY";

    const { resolveProviderKey } = await import("@/lib/integrations/resolve-key");
    const resolved = await resolveProviderKey(projectId, providerName, envVar);

    if (!resolved) {
      return apiError(
        `No API key found for ${providerName}. Add one via Settings → Integrations, or set ${envVar} in your .env file.`,
        400
      );
    }
    const apiKey = resolved.apiKey;

    const body = await validateBody(request, executeSchema);

    // ── Resolve model ──
    const providerKey = agent.model;
    const strategy = (agent as Record<string, unknown>).modelStrategy as string ?? "auto";
    const selectionStart = Date.now();
    let resolvedModelId: string;
    let selectedTier: number | null = null;
    let selectionReason: string | null = null;

    if (strategy === "manual" || providerKey !== "CLAUDE") {
      resolvedModelId = PROVIDER_DEFAULT_MODEL[providerKey] || "claude-sonnet-4-6";
      selectionReason = "Manual strategy — using provider default";
    } else if (strategy === "cost_first") {
      const tierConfig = getTierConfig(providerKey as ProviderKey, 3);
      resolvedModelId = tierConfig?.modelId ?? "claude-haiku-4-5";
      selectedTier = 3;
      selectionReason = "Cost-first strategy — always tier 3";
    } else if (strategy === "quality_first") {
      const tierConfig = getTierConfig(providerKey as ProviderKey, 1);
      resolvedModelId = tierConfig?.modelId ?? "claude-opus-4-6";
      selectedTier = 1;
      selectionReason = "Quality-first strategy — always tier 1";
    } else {
      const profile = profileTask(
        {
          name: agent.name,
          model: providerKey,
          tags: agent.tags,
          tools: [],
          systemPrompt: agent.systemPrompt,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          tasksCompleted: agent.tasksCompleted,
        },
        body.input
      );
      const selection = selectModel(profile);
      resolvedModelId = selection.modelId;
      selectedTier = selection.tier;
      selectionReason = selection.reason;
    }
    const selectionDurationMs = Date.now() - selectionStart;

    // Cost rates
    let inputRate = 0.003 / 1000;
    let outputRate = 0.015 / 1000;
    if (selectedTier) {
      const tierConfig = getTierConfig(providerKey as ProviderKey, selectedTier as Tier);
      if (tierConfig) {
        inputRate = tierConfig.inputCostPerMillion / 1_000_000;
        outputRate = tierConfig.outputCostPerMillion / 1_000_000;
      }
    }

    // ── Execute (non-streaming) ──
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: "RUNNING" as never },
    });

    const startTime = Date.now();
    const client = new Anthropic({ apiKey });

    try {
      // Use streaming internally but collect the full result (Anthropic SDK
      // requires streaming for requests that may exceed 10 minutes).
      const stream = client.messages.stream({
        model: resolvedModelId,
        max_tokens: agent.maxTokens,
        temperature: agent.temperature,
        system: resolvedSystemPrompt || undefined,
        messages: [{ role: "user", content: body.input }],
      });

      const finalMessage = await stream.finalMessage();

      const duration = Date.now() - startTime;
      const tokensIn = finalMessage.usage.input_tokens;
      const tokensOut = finalMessage.usage.output_tokens;
      const cost = Math.round((tokensIn * inputRate + tokensOut * outputRate) * 10000) / 10000;
      const output = finalMessage.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      // Save to DB
      await Promise.all([
        prisma.llmCall.create({
          data: {
            projectId,
            model: resolvedModelId,
            prompt: `[system] ${agent.systemPrompt}\n[user] ${body.input}`,
            response: output,
            tokensIn,
            tokensOut,
            latency: duration,
            cost,
            agentId,
            agentName: agent.name,
            selectedTier,
            selectionReason,
            selectionDurationMs,
            wasUpgraded: false,
            originalTier: null,
          },
        }),
        prisma.agentRun.create({
          data: {
            agentId,
            duration,
            status: "RUN_SUCCESS" as never,
            tokensUsed: tokensIn + tokensOut,
            cost,
            output,
          },
        }),
        prisma.agent.update({
          where: { id: agentId },
          data: {
            status: "IDLE" as never,
            lastRun: new Date(),
            tokenUsage: { increment: tokensIn + tokensOut },
            totalCost: { increment: cost },
            tasksCompleted: { increment: 1 },
          },
        }),
      ]);

      // Notification: agent run completed
      createNotification({
        projectId,
        title: "Agent run completed",
        message: `${agent.name} completed in ${duration}ms · $${cost.toFixed(4)}`,
        type: "success",
        category: "agent",
        link: `/agents/${agentId}`,
      }).catch(() => {});

      // Cost anomaly auto-pause check
      checkCostAnomaly(agentId, projectId).catch(() => {});

      // Auto-Downshift shadow run (non-blocking, guarded by per-project config)
      maybeDispatchShadow({
        projectId,
        agentId,
        providerKey,
        productionModel: resolvedModelId,
        productionTier: selectedTier,
        input: body.input,
        systemPrompt: resolvedSystemPrompt,
        productionOutput: output,
        productionTokensIn: tokensIn,
        productionTokensOut: tokensOut,
        productionCost: cost,
        apiKey,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
      }).catch(() => {});

      return apiResponse({
        output,
        tokensIn,
        tokensOut,
        cost,
        duration,
        model: resolvedModelId,
        selectedTier,
      });
    } catch (err) {
      const errorMsg = (err as Error).message;
      const duration = Date.now() - startTime;

      await Promise.all([
        prisma.agentRun.create({
          data: {
            agentId,
            duration,
            status: "RUN_FAILED" as never,
            tokensUsed: 0,
            cost: 0,
            output: `Error: ${errorMsg}`,
          },
        }),
        prisma.agent.update({
          where: { id: agentId },
          data: { status: "ERROR" as never, lastRun: new Date() },
        }),
      ]);

      // Notification: agent run failed
      createNotification({
        projectId,
        title: "Agent run failed",
        message: `${agent.name} failed: ${errorMsg}`,
        type: "error",
        category: "agent",
        link: `/agents/${agentId}`,
      }).catch(() => {});

      throw new ApiError(`Agent execution failed: ${errorMsg}`, 500);
    }
  }
);
