/**
 * Proposal Generator — Auto-Downshift step 4
 *
 * Aggregates scored ShadowRun rows per agent/shadow-model, checks whether
 * parity crosses the project's threshold over a statistically meaningful
 * sample, and upserts a DownshiftProposal row when it does.
 *
 * Design notes:
 * - Pull-based: call this whenever the user opens /costs, or nightly via
 *   a scheduled task. Idempotent via @@unique([projectId, agentId,
 *   fromModel, toModel, status]).
 * - 30-day cooldown: if the user rejected a proposal for the same
 *   (agent, from, to) triple less than 30 days ago, we skip regenerating
 *   it. Accepted proposals get skipped forever (the agent model changes).
 * - estMonthlySavings is projected from the rolling production spend, not
 *   from the shadow sample — the shadow is a tiny fraction of traffic, so
 *   extrapolation needs the full production denominator.
 */

import { prisma } from "@/lib/prisma";

const COOLDOWN_DAYS = 30;
const WINDOW_DAYS = 30;

export interface GenerateResult {
  projectId: string;
  evaluatedGroups: number;
  created: number;
  updated: number;
  skippedInsufficientSamples: number;
  skippedInCooldown: number;
  skippedBelowParity: number;
}

export async function generateProposals(projectId: string): Promise<GenerateResult> {
  const result: GenerateResult = {
    projectId,
    evaluatedGroups: 0,
    created: 0,
    updated: 0,
    skippedInsufficientSamples: 0,
    skippedInCooldown: 0,
    skippedBelowParity: 0,
  };

  const config = await prisma.downshiftConfig.findUnique({
    where: { projectId },
  });
  if (!config) return result;

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);
  const cooldownSince = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000);

  // Pull all scored shadow runs in window for this project
  const runs = await prisma.shadowRun.findMany({
    where: {
      projectId,
      scoredAt: { not: null, gte: since },
      productionScore: { not: null },
      shadowScore: { not: null },
    },
    select: {
      agentId: true,
      productionModel: true,
      productionTier: true,
      shadowModel: true,
      shadowTier: true,
      productionScore: true,
      shadowScore: true,
      productionCost: true,
      shadowCost: true,
      judgeMethod: true,
    },
  });

  // Group by (agentId, productionModel, shadowModel) — one proposal per triple
  type GroupKey = string;
  const groups = new Map<
    GroupKey,
    {
      agentId: string;
      fromModel: string;
      toModel: string;
      fromTier: number;
      toTier: number;
      prodScores: number[];
      shadowScores: number[];
      prodCost: number;
      shadowCost: number;
      judgeMethod: string;
    }
  >();

  for (const r of runs) {
    const key = `${r.agentId}::${r.productionModel}::${r.shadowModel}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        agentId: r.agentId,
        fromModel: r.productionModel,
        toModel: r.shadowModel,
        fromTier: r.productionTier,
        toTier: r.shadowTier,
        prodScores: [],
        shadowScores: [],
        prodCost: 0,
        shadowCost: 0,
        judgeMethod: r.judgeMethod ?? "llm_judge",
      };
      groups.set(key, g);
    }
    g.prodScores.push(r.productionScore!);
    g.shadowScores.push(r.shadowScore!);
    g.prodCost += r.productionCost;
    g.shadowCost += r.shadowCost;
  }

  result.evaluatedGroups = groups.size;

  for (const g of Array.from(groups.values())) {
    const n = g.prodScores.length;

    // 1) Sample size gate
    if (n < config.minSampleSize) {
      result.skippedInsufficientSamples++;
      continue;
    }

    // 2) Parity check
    const prodMean = g.prodScores.reduce((s, v) => s + v, 0) / n;
    const shadowMean = g.shadowScores.reduce((s, v) => s + v, 0) / n;
    const parityRatio = prodMean > 0 ? shadowMean / prodMean : 0;

    if (parityRatio < config.parityThreshold) {
      result.skippedBelowParity++;
      continue;
    }

    // 3) Cooldown check: was there a recent rejection?
    const recentRejection = await prisma.downshiftProposal.findFirst({
      where: {
        projectId,
        agentId: g.agentId,
        fromModel: g.fromModel,
        toModel: g.toModel,
        status: "rejected",
        decidedAt: { gte: cooldownSince },
      },
    });
    if (recentRejection) {
      result.skippedInCooldown++;
      continue;
    }

    // 4) Was the agent already moved to this target? (accepted proposal exists)
    const alreadyAccepted = await prisma.downshiftProposal.findFirst({
      where: {
        projectId,
        agentId: g.agentId,
        fromModel: g.fromModel,
        toModel: g.toModel,
        status: "accepted",
      },
    });
    if (alreadyAccepted) continue;

    // 5) Estimate monthly savings from full production spend, not shadow sample
    const since30 = new Date(Date.now() - 30 * 86_400_000);
    const prodSpend = await prisma.llmCall.aggregate({
      where: {
        projectId,
        agentId: g.agentId,
        model: g.fromModel,
        timestamp: { gte: since30 },
      },
      _sum: { cost: true },
    });
    const prodCost30d = prodSpend._sum.cost ?? 0;

    // Savings ratio from the shadow sample: what % of dollars do we save?
    const savingsRatio =
      g.prodCost > 0 ? Math.max(0, (g.prodCost - g.shadowCost) / g.prodCost) : 0;
    const estMonthlySavings = Math.round(prodCost30d * savingsRatio * 100) / 100;

    // 6) Upsert proposal (pending + same triple = update; else create)
    const existing = await prisma.downshiftProposal.findFirst({
      where: {
        projectId,
        agentId: g.agentId,
        fromModel: g.fromModel,
        toModel: g.toModel,
        status: "pending",
      },
    });

    if (existing) {
      await prisma.downshiftProposal.update({
        where: { id: existing.id },
        data: {
          sampleSize: n,
          parityRatio: Math.round(parityRatio * 10000) / 10000,
          shadowMean: Math.round(shadowMean * 10000) / 10000,
          productionMean: Math.round(prodMean * 10000) / 10000,
          estMonthlySavings,
          judgeMethod: g.judgeMethod,
        },
      });
      result.updated++;
    } else {
      await prisma.downshiftProposal.create({
        data: {
          projectId,
          agentId: g.agentId,
          fromModel: g.fromModel,
          toModel: g.toModel,
          fromTier: g.fromTier,
          toTier: g.toTier,
          sampleSize: n,
          parityRatio: Math.round(parityRatio * 10000) / 10000,
          shadowMean: Math.round(shadowMean * 10000) / 10000,
          productionMean: Math.round(prodMean * 10000) / 10000,
          estMonthlySavings,
          judgeMethod: g.judgeMethod,
          status: "pending",
        },
      });
      result.created++;
    }
  }

  return result;
}
