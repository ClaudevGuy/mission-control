import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
  parsePagination,
} from "@/lib/api-helpers";

// ── GET /api/logs/traces ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const traceId = searchParams.get("traceId");

  if (traceId) {
    // Return all spans for a specific trace
    const spans = await prisma.traceSpan.findMany({
      where: { projectId, traceId },
      orderBy: { start: "asc" },
    });

    return apiResponse({ spans });
  }

  // Return grouped traces (distinct traceIds with first span info)
  const spans = await prisma.traceSpan.findMany({
    where: { projectId },
    orderBy: { start: "desc" },
    distinct: ["traceId"],
    skip,
    take: limit,
  });

  const total = await prisma.traceSpan.groupBy({
    by: ["traceId"],
    where: { projectId },
  });

  return apiResponse({
    traces: spans,
    pagination: { page, limit, total: total.length, totalPages: Math.ceil(total.length / limit) },
  });
});
