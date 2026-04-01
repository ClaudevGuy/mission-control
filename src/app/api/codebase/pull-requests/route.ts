import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
  parsePagination,
} from "@/lib/api-helpers";

// ── GET /api/codebase/pull-requests ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const status = searchParams.get("status");
  const repositoryId = searchParams.get("repositoryId");

  // Get repos belonging to this project
  const repos = await prisma.repository.findMany({
    where: { projectId },
    select: { id: true },
  });
  const repoIds = repos.map((r) => r.id);

  const where = {
    repositoryId: repositoryId ? repositoryId : { in: repoIds },
    ...(status && { status: status.toUpperCase() as never }),
  };

  const [pullRequests, total] = await Promise.all([
    prisma.pullRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { repository: { select: { name: true } } },
    }),
    prisma.pullRequest.count({ where }),
  ]);

  return apiResponse({
    pullRequests,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
