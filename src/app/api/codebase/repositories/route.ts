import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
} from "@/lib/api-helpers";

// ── GET /api/codebase/repositories ──

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withErrorHandler(async (_request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();

  const repositories = await prisma.repository.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
  });

  return apiResponse({ repositories });
});
