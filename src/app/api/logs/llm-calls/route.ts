import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
  parsePagination,
} from "@/lib/api-helpers";

// ── GET /api/logs/llm-calls ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const model = searchParams.get("model");
  const agentId = searchParams.get("agentId");

  const where = {
    projectId,
    ...(model && { model }),
    ...(agentId && { agentId }),
  };

  const [calls, total] = await Promise.all([
    prisma.llmCall.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: "desc" },
    }),
    prisma.llmCall.count({ where }),
  ]);

  return apiResponse({
    calls,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
