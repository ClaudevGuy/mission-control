import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import {
  requireRole,
  getProjectId,
  apiError,
  ApiError,
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
  // Optional prior conversation. If provided, the agent treats this as a multi-turn
  // conversation and appends `input` as the next user turn.
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
});

// Default model per provider (used for "manual" strategy)
const PROVIDER_DEFAULT_MODEL: Record<string, string> = {
  CLAUDE: "claude-sonnet-4-6",
  GPT4: "gpt-4o",
  GEMINI: "gemini-2.0-flash",
};

// ── POST /api/agents/[id]/execute — Streaming SSE ──

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("developer");
    const ip = (await headers()).get("x-forwarded-for") ?? "anon";
    const rl = rateLimit(`execute:${user.id}:${ip}`, { limit: 20, windowMs: 60_000 });
    if (!rl.success) {
      return apiError("Rate limit exceeded — max 20 executions per minute", 429);
    }

    const projectId = await getProjectId();
    const { id: agentId } = await context.params;
    if (!agentId) return apiError("Agent ID is required", 400);

    // Load agent
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, projectId },
    });
    if (!agent) throw new ApiError("Agent not found", 404);

    // Resolve linked Prompt Studio prompt (if agent uses one)
    let resolvedSystemPrompt = agent.systemPrompt || "";
    if (resolvedSystemPrompt.startsWith("__PROMPT_STUDIO__:")) {
      const promptId = resolvedSystemPrompt.replace("__PROMPT_STUDIO__:", "");
      const promptVersion = await prisma.promptVersion.findFirst({
        where: { id: promptId, projectId, isActive: true },
      });
      if (!promptVersion) {
        // Fall back to latest version for this prompt's name
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

    // Resolve API key: check integrations DB first, then fall back to .env.
    // The resolver logs which source it used — useful when a broken DB row
    // is silently masking a working .env key.
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

    // Parse body
    const body = executeSchema.parse(await request.json());

    // ── Resolve model based on strategy ──
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

    // Update agent to running
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: "RUNNING" as never },
    });

    const startTime = Date.now();
    const client = new Anthropic({ apiKey });

    // Build messages — prepend any prior conversation turns, then the new user input.
    // Multi-turn: `body.history` is optional; when absent this is a single-turn request.
    const priorTurns: Anthropic.MessageParam[] = (body.history ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const userMessages: Anthropic.MessageParam[] = [
      ...priorTurns,
      { role: "user", content: body.input },
    ];

    // ── Stream response via SSE ──
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Send model selection info first
        send({
          type: "info",
          model: resolvedModelId,
          tier: selectedTier,
          reason: selectionReason,
          selectionMs: selectionDurationMs,
        });

        let fullContent = "";
        let tokensIn = 0;
        let tokensOut = 0;

        try {
          const stream = client.messages.stream({
            model: resolvedModelId,
            max_tokens: agent.maxTokens,
            temperature: agent.temperature,
            system: resolvedSystemPrompt || undefined,
            messages: userMessages,
          });

          stream.on("text", (text) => {
            fullContent += text;
            send({ type: "delta", content: text });
          });

          const finalMessage = await stream.finalMessage();
          tokensIn = finalMessage.usage.input_tokens;
          tokensOut = finalMessage.usage.output_tokens;

          const duration = Date.now() - startTime;
          const cost = tokensIn * inputRate + tokensOut * outputRate;

          // Calculate what Tier 1 would have cost for savings display
          const tier1Config = getTierConfig(providerKey as ProviderKey, 1);
          const tier1Cost = tier1Config
            ? tokensIn * (tier1Config.inputCostPerMillion / 1_000_000) + tokensOut * (tier1Config.outputCostPerMillion / 1_000_000)
            : cost;

          // Send completion event
          send({
            type: "done",
            tokensIn,
            tokensOut,
            cost: Math.round(cost * 10000) / 10000,
            tier1Cost: Math.round(tier1Cost * 10000) / 10000,
            duration,
            model: resolvedModelId,
          });

          // ── Save to DB (async, don't block stream) ──
          const dbOps = async () => {
            await prisma.llmCall.create({
              data: {
                projectId,
                model: resolvedModelId,
                prompt: `[system] ${agent.systemPrompt}\n[user] ${body.input}`,
                response: fullContent,
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
            });

            await prisma.agentRun.create({
              data: {
                agentId,
                duration,
                status: "RUN_SUCCESS" as never,
                tokensUsed: tokensIn + tokensOut,
                cost,
                input: body.input,
                output: fullContent,
                model: resolvedModelId,
                tier: selectedTier,
                tokensIn,
                tokensOut,
              },
            });

            await prisma.agent.update({
              where: { id: agentId },
              data: {
                status: "IDLE" as never,
                lastRun: new Date(),
                tokenUsage: { increment: tokensIn + tokensOut },
                totalCost: { increment: cost },
                tasksCompleted: { increment: 1 },
              },
            });
          };

          dbOps().catch((err) => console.error("DB save error:", err));

          // Auto-Downshift shadow run (non-blocking, guarded by per-project config)
          maybeDispatchShadow({
            projectId,
            agentId,
            providerKey,
            productionModel: resolvedModelId,
            productionTier: selectedTier,
            input: body.input,
            systemPrompt: resolvedSystemPrompt,
            productionOutput: fullContent,
            productionTokensIn: tokensIn,
            productionTokensOut: tokensOut,
            productionCost: cost,
            apiKey,
            temperature: agent.temperature,
            maxTokens: agent.maxTokens,
          }).catch(() => {});

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
        } catch (err) {
          const errorMsg = (err as Error).message;
          send({ type: "error", message: errorMsg });

          // Record failure
          prisma.agentRun.create({
            data: {
              agentId,
              duration: Date.now() - startTime,
              status: "RUN_FAILED" as never,
              tokensUsed: 0,
              cost: 0,
              output: `Error: ${errorMsg}`,
            },
          }).catch(() => {});

          prisma.agent.update({
            where: { id: agentId },
            data: { status: "ERROR" as never, lastRun: new Date() },
          }).catch(() => {});

          // Notification: agent run failed
          createNotification({
            projectId,
            title: "Agent run failed",
            message: `${agent.name} failed: ${errorMsg}`,
            type: "error",
            category: "agent",
            link: `/agents/${agentId}`,
          }).catch(() => {});
        }

        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof z.ZodError) {
      return apiError(`Validation error: ${err.issues.map((e) => e.message).join(", ")}`, 422);
    }
    console.error("Execute error:", err);
    return apiError("Internal server error", 500);
  }
}
