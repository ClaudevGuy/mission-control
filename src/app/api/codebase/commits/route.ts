import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
  parsePagination,
} from "@/lib/api-helpers";

// ── GET /api/codebase/commits ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const repositoryId = searchParams.get("repositoryId");
  const author = searchParams.get("author");
  const isAgent = searchParams.get("isAgent");

  // Get repos belonging to this project
  const repos = await prisma.repository.findMany({
    where: { projectId },
    select: { id: true },
  });
  const repoIds = repos.map((r) => r.id);

  const where = {
    repositoryId: repositoryId ? repositoryId : { in: repoIds },
    ...(author && { author }),
    ...(isAgent !== null && isAgent !== undefined && { isAgent: isAgent === "true" }),
  };

  const [commits, total] = await Promise.all([
    prisma.commit.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: "desc" },
      include: { repository: { select: { name: true } } },
    }),
    prisma.commit.count({ where }),
  ]);

  return apiResponse({
    commits,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
