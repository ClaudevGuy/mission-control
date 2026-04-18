/**
 * Shadow Dispatcher — Auto-Downshift step 2
 *
 * For a small % of production runs, fire a parallel "shadow" call on the
 * next-cheaper tier and persist both outputs. Runs fully non-blocking — we
 * never make the production caller wait for the shadow result.
 *
 * The dispatcher is deliberately best-effort: any error is swallowed so a
 * flaky shadow never degrades a real run.
 */

import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { getTierConfig, type Tier, type ProviderKey } from "@/lib/model-selector";

const VALID_PROVIDERS: ProviderKey[] = ["CLAUDE", "GPT4", "GEMINI"];

export interface ShadowDispatchOpts {
  projectId: string;
  agentId: string;
  parentRunId?: string;                 // AgentRun or LlmCall id
  providerKey: string;                  // Agent.model enum
  productionModel: string;              // resolved model id (e.g. "claude-opus-4-6")
  productionTier: number | null;        // tier 1/2/3, null = unknown (manual strategy)
  input: string;
  systemPrompt: string;
  productionOutput: string;
  productionTokensIn: number;
  productionTokensOut: number;
  productionCost: number;
  apiKey: string;
  temperature: number;
  maxTokens: number;
}

export async function maybeDispatchShadow(opts: ShadowDispatchOpts): Promise<void> {
  try {
    // ── Eligibility gate ──

    // Only downshift within the known provider tier registry
    if (!VALID_PROVIDERS.includes(opts.providerKey as ProviderKey)) return;

    // Need a known source tier to know what "cheaper" means
    if (!opts.productionTier) return;

    // Tier 3 is already the cheapest — nothing to downshift to
    if (opts.productionTier >= 3) return;

    // Load config (lazy-create default row if none)
    const config = await prisma.downshiftConfig.findUnique({
      where: { projectId: opts.projectId },
    });
    if (!config?.enabled) return;

    // Sample gate: honour sampleRatePercent (1-20)
    const rate = Math.max(0, Math.min(20, config.sampleRatePercent)) / 100;
    if (Math.random() > rate) return;

    // ── Determine shadow tier ──
    const shadowTier = (opts.productionTier + 1) as Tier;
    const shadowConfig = getTierConfig(opts.providerKey as ProviderKey, shadowTier);
    if (!shadowConfig) return;

    // ── Dispatch (currently CLAUDE only — OpenAI/Gemini shadows are a follow-up) ──
    if (opts.providerKey !== "CLAUDE") return;

    const client = new Anthropic({ apiKey: opts.apiKey });
    const start = Date.now();

    const stream = client.messages.stream({
      model: shadowConfig.modelId,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      system: opts.systemPrompt || undefined,
      messages: [{ role: "user", content: opts.input }],
    });

    const finalMessage = await stream.finalMessage();
    const latencyMs = Date.now() - start;

    const shadowTokensIn = finalMessage.usage.input_tokens;
    const shadowTokensOut = finalMessage.usage.output_tokens;
    const shadowOutput = finalMessage.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const inputRate = shadowConfig.inputCostPerMillion / 1_000_000;
    const outputRate = shadowConfig.outputCostPerMillion / 1_000_000;
    const shadowCost =
      Math.round((shadowTokensIn * inputRate + shadowTokensOut * outputRate) * 10000) /
      10000;

    // ── Persist ──
    await prisma.shadowRun.create({
      data: {
        projectId: opts.projectId,
        agentId: opts.agentId,
        parentRunId: opts.parentRunId ?? null,
        productionModel: opts.productionModel,
        productionTier: opts.productionTier,
        shadowModel: shadowConfig.modelId,
        shadowTier,
        input: opts.input,
        systemPrompt: opts.systemPrompt,
        productionOutput: opts.productionOutput,
        shadowOutput,
        productionCost: opts.productionCost,
        shadowCost,
        productionTokensIn: opts.productionTokensIn,
        productionTokensOut: opts.productionTokensOut,
        shadowTokensIn,
        shadowTokensOut,
        shadowLatencyMs: latencyMs,
      },
    });
  } catch (err) {
    // Best-effort — never let shadow errors surface to the production caller
    console.error("[downshift] shadow dispatch failed:", (err as Error).message);
  }
}
