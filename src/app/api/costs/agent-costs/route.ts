import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
  parsePagination,
} from "@/lib/api-helpers";

// ── GET /api/costs/agent-costs ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const [costs, total] = await Promise.all([
    prisma.agentCost.findMany({
      where: { projectId },
      skip,
      take: limit,
      orderBy: { totalCost: "desc" },
    }),
    prisma.agentCost.count({ where: { projectId } }),
  ]);

  return apiResponse({
    costs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
