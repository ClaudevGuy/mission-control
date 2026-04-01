import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
} from "@/lib/api-helpers";

// ── GET /api/analytics/retention ──

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withErrorHandler(async (_request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();

  const cohorts = await prisma.retentionCohort.findMany({
    where: { projectId },
    orderBy: [{ cohortWeek: "desc" }, { weekIndex: "asc" }],
  });

  return apiResponse({ cohorts });
});
