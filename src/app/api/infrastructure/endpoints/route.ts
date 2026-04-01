import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
  parsePagination,
} from "@/lib/api-helpers";

// ── GET /api/infrastructure/endpoints ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const status = searchParams.get("status");

  const where = {
    projectId,
    ...(status && { status: status.toUpperCase() as never }),
  };

  const [endpoints, total] = await Promise.all([
    prisma.apiEndpoint.findMany({
      where,
      skip,
      take: limit,
      orderBy: { path: "asc" },
    }),
    prisma.apiEndpoint.count({ where }),
  ]);

  return apiResponse({
    endpoints,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
