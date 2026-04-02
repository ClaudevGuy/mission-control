import { prisma } from "@/lib/prisma";
import { withErrorHandler, requireAuth, getProjectId, apiResponse } from "@/lib/api-helpers";
import { getTierConfig, type ProviderKey } from "@/lib/model-selector";

export const GET = withErrorHandler(async () => {
  await requireAuth();
  const projectId = await getProjectId();

  const calls = await prisma.llmCall.findMany({
    where: { projectId, selectedTier: { not: null } },
    select: {
      selectedTier: true,
      cost: true,
      tokensIn: true,
      tokensOut: true,
      wasUpgraded: true,
      model: true,
    },
  });

  const actualCost = calls.reduce((sum, c) => sum + c.cost, 0);

  let tier1Cost = 0;
  for (const call of calls) {
    let provider: ProviderKey = "CLAUDE";
    if (call.model.includes("gpt")) provider = "GPT4";
    else if (call.model.includes("gemini")) provider = "GEMINI";
    const t1 = getTierConfig(provider, 1);
    if (t1) {
      tier1Cost +=
        call.tokensIn * (t1.inputCostPerMillion / 1_000_000) +
        call.tokensOut * (t1.outputCostPerMillion / 1_000_000);
    } else {
      tier1Cost += call.cost;
    }
  }

  const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  let upgradeEvents = 0;
  for (const call of calls) {
    if (call.selectedTier) tierCounts[call.selectedTier] = (tierCounts[call.selectedTier] || 0) + 1;
    if (call.wasUpgraded) upgradeEvents++;
  }

  const totalCalls = calls.length || 1;
  const savings = tier1Cost - actualCost;
  const savingsPercent = tier1Cost > 0 ? Math.round((savings / tier1Cost) * 100) : 0;

  return apiResponse({
    actualCost,
    tier1Cost,
    savings,
    savingsPercent,
    upgradeEvents,
    tierDistribution: {
      tier1: { count: tierCounts[1], percent: Math.round((tierCounts[1] / totalCalls) * 100) },
      tier2: { count: tierCounts[2], percent: Math.round((tierCounts[2] / totalCalls) * 100) },
      tier3: { count: tierCounts[3], percent: Math.round((tierCounts[3] / totalCalls) * 100) },
    },
    totalCalls: calls.length,
  });
});
