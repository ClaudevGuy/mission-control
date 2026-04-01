import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
} from "@/lib/api-helpers";

// ── GET /api/analytics/geo ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;

  const date = searchParams.get("date");

  // Get the latest snapshot date if not specified
  const where = {
    projectId,
    ...(date && { snapshotDate: new Date(date) }),
  };

  const data = await prisma.geoData.findMany({
    where: date
      ? where
      : {
          projectId,
          snapshotDate: (
            await prisma.geoData.findFirst({
              where: { projectId },
              orderBy: { snapshotDate: "desc" },
              select: { snapshotDate: true },
            })
          )?.snapshotDate,
        },
    orderBy: { users: "desc" },
  });

  return apiResponse({ data });
});
