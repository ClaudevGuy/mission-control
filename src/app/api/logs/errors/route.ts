import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
  parsePagination,
} from "@/lib/api-helpers";

// ── GET /api/logs/errors ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const service = searchParams.get("service");

  const where = {
    projectId,
    ...(service && { service }),
  };

  const [groups, total] = await Promise.all([
    prisma.errorGroup.findMany({
      where,
      skip,
      take: limit,
      orderBy: { lastSeen: "desc" },
    }),
    prisma.errorGroup.count({ where }),
  ]);

  return apiResponse({
    groups,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
