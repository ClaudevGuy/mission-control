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

// ── GET /api/team/audit-log ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const userId = searchParams.get("userId");
  const action = searchParams.get("action");

  const where: Prisma.AuditLogEntryWhereInput = { projectId };

  if (userId) where.userId = userId;
  if (action) where.action = action;

  const [entries, total] = await Promise.all([
    prisma.auditLogEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: "desc" },
    }),
    prisma.auditLogEntry.count({ where }),
  ]);

  return apiResponse({
    entries,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
