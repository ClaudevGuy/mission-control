import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
  parsePagination,
} from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";

// ── GET /api/logs ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const level = searchParams.get("level");
  const service = searchParams.get("service");
  const search = searchParams.get("search");
  const agentId = searchParams.get("agentId");
  const traceId = searchParams.get("traceId");

  const where: Prisma.LogEntryWhereInput = { projectId };

  if (level) where.level = level.toUpperCase() as never;
  if (service) where.service = service;
  if (agentId) where.agentId = agentId;
  if (traceId) where.traceId = traceId;
  if (search) {
    where.message = { contains: search, mode: "insensitive" };
  }

  const [entries, total] = await Promise.all([
    prisma.logEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: "desc" },
    }),
    prisma.logEntry.count({ where }),
  ]);

  return apiResponse({
    entries,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
