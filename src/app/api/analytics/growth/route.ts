import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
} from "@/lib/api-helpers";

// ── GET /api/analytics/growth ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;

  const date = searchParams.get("date");

  const latestDate = date
    ? new Date(date)
    : (
        await prisma.growthMetric.findFirst({
          where: { projectId },
          orderBy: { snapshotDate: "desc" },
          select: { snapshotDate: true },
        })
      )?.snapshotDate;

  const metrics = await prisma.growthMetric.findMany({
    where: { projectId, snapshotDate: latestDate },
    orderBy: { metric: "asc" },
  });

  return apiResponse({ metrics });
});
