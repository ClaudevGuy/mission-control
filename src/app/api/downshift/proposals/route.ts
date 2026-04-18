import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
} from "@/lib/api-helpers";
import { generateProposals } from "@/lib/downshift/generator";

// ── GET /api/downshift/proposals ──
// Lists pending proposals. Optionally regenerates first (?refresh=1).
// Each proposal is decorated with the agent name for the UI.

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();

  const refresh = request.nextUrl.searchParams.get("refresh") === "1";
  let generated: Awaited<ReturnType<typeof generateProposals>> | null = null;

  if (refresh) {
    generated = await generateProposals(projectId);
  }

  const proposals = await prisma.downshiftProposal.findMany({
    where: { projectId, status: "pending" },
    orderBy: [{ estMonthlySavings: "desc" }, { createdAt: "desc" }],
  });

  // Hydrate with agent names
  const agentIds = Array.from(new Set(proposals.map((p) => p.agentId)));
  const agents = agentIds.length
    ? await prisma.agent.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, name: true },
      })
    : [];
  const agentNameById = new Map(agents.map((a) => [a.id, a.name]));

  return apiResponse({
    proposals: proposals.map((p) => ({
      ...p,
      agentName: agentNameById.get(p.agentId) ?? "Unknown agent",
    })),
    generated,
  });
});
