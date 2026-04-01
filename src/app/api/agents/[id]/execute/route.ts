import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
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
import { decrypt } from "@/lib/encryption";
import { chat as anthropicChat } from "@/lib/integrations/adapters/anthropic";
import { chat as openaiChat } from "@/lib/integrations/adapters/openai";
import type { ChatMessage, ChatConfig } from "@/lib/integrations/types";

const executeSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    )
    .optional(),
  input: z.string().optional(),
});

// Model provider to integration name mapping
const PROVIDER_INTEGRATION_MAP: Record<string, string> = {
  CLAUDE: "Anthropic",
  GPT4: "OpenAI",
};

// Default model per provider
const PROVIDER_DEFAULT_MODEL: Record<string, string> = {
  CLAUDE: "claude-sonnet-4-20250514",
  GPT4: "gpt-4o",
};

// ── POST /api/agents/[id]/execute ──

export const POST = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const user = await requireRole("developer");
    // Rate limit: 20 executions per minute per user (prevents runaway LLM cost)
    // NOTE: x-forwarded-for can be spoofed without a trusted reverse proxy — user.id is the real guard
    const ip = (await headers()).get("x-forwarded-for") ?? "anon";
    const rl = rateLimit(`execute:${user.id}:${ip}`, { limit: 20, windowMs: 60_000 });
    if (!rl.success) {
      return apiError("Rate limit exceeded — max 20 executions per minute", 429);
    }
    const projectId = await getProjectId();
    const agentId = context?.params?.id;

    if (!agentId) return apiError("Agent ID is required", 400);

    // Load agent
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, projectId },
    });
    if (!agent) throw new ApiError("Agent not found", 404);

    // Determine AI provider
    const providerKey = agent.model; // e.g. "CLAUDE", "GPT4"
    const integrationName = PROVIDER_INTEGRATION_MAP[providerKey];
    if (!integrationName) {
      return apiError(
        `Unsupported model provider: ${providerKey}. Supported: ${Object.keys(PROVIDER_INTEGRATION_MAP).join(", ")}`,
        400
      );
    }

    // Find the connected integration for this provider
    const integration = await prisma.integration.findFirst({
      where: {
        projectId,
        name: integrationName,
        status: "CONNECTED",
      },
    });
    if (!integration) {
      return apiError(
        `No connected ${integrationName} integration found. Connect it in Integrations settings first.`,
        400
      );
    }

    // Decrypt API key from integration config
    const rawConfig = (integration.config as Record<string, string>) || {};
    const decryptedConfig: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawConfig)) {
      try {
        decryptedConfig[key] = decrypt(value);
      } catch {
        decryptedConfig[key] = value;
      }
    }

    const apiKey = decryptedConfig.apiKey;
    if (!apiKey) {
      return apiError(
        `${integrationName} integration is missing an API key in its config.`,
        400
      );
    }

    // Parse request body
    const body = await validateBody(request, executeSchema);

    // Build message list: system prompt + user messages
    const messages: ChatMessage[] = [];
    if (agent.systemPrompt) {
      messages.push({ role: "system", content: agent.systemPrompt });
    }
    if (body.messages && body.messages.length > 0) {
      messages.push(...body.messages);
    } else if (body.input) {
      messages.push({ role: "user", content: body.input });
    } else {
      return apiError(
        "Provide either `messages` array or `input` string",
        400
      );
    }

    const chatConfig: ChatConfig = {
      model: PROVIDER_DEFAULT_MODEL[providerKey] || "claude-sonnet-4-20250514",
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
    };

    // Execute the LLM call
    const startTime = Date.now();
    let result;

    try {
      if (providerKey === "CLAUDE") {
        result = await anthropicChat(apiKey, messages, chatConfig);
      } else {
        result = await openaiChat(apiKey, messages, chatConfig);
      }
    } catch (err) {
      // Record failed run
      await prisma.agentRun.create({
        data: {
          agentId,
          duration: Date.now() - startTime,
          status: "RUN_FAILED" as never,
          tokensUsed: 0,
          cost: 0,
          output: `Error: ${(err as Error).message}`,
        },
      });

      // Update agent status
      await prisma.agent.update({
        where: { id: agentId },
        data: { status: "ERROR" as never, lastRun: new Date() },
      });

      return apiError(`LLM call failed: ${(err as Error).message}`, 502);
    }

    const duration = Date.now() - startTime;
    const totalTokens = result.tokensIn + result.tokensOut;

    // Estimate cost (rough rates per 1K tokens)
    const costRates: Record<string, { input: number; output: number }> = {
      CLAUDE: { input: 0.003, output: 0.015 },
      GPT4: { input: 0.0025, output: 0.01 },
    };
    const rates = costRates[providerKey] || { input: 0.003, output: 0.015 };
    const estimatedCost =
      (result.tokensIn / 1000) * rates.input +
      (result.tokensOut / 1000) * rates.output;

    // Record the LLM call
    await prisma.llmCall.create({
      data: {
        projectId,
        model: chatConfig.model,
        prompt: messages.map((m) => `[${m.role}] ${m.content}`).join("\n"),
        response: result.content,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latency: duration,
        cost: estimatedCost,
        agentId,
        agentName: agent.name,
      },
    });

    // Record the agent run
    const agentRun = await prisma.agentRun.create({
      data: {
        agentId,
        duration,
        status: "RUN_SUCCESS" as never,
        tokensUsed: totalTokens,
        cost: estimatedCost,
        output: result.content,
      },
    });

    // Update agent stats
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: "IDLE" as never,
        lastRun: new Date(),
        tokenUsage: { increment: totalTokens },
        totalCost: { increment: estimatedCost },
        tasksCompleted: { increment: 1 },
      },
    });

    return apiResponse({
      runId: agentRun.id,
      content: result.content,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      cost: estimatedCost,
      duration,
      model: chatConfig.model,
      provider: integrationName,
    });
  }
);
