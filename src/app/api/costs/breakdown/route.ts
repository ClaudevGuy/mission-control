import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
} from "@/lib/api-helpers";

// ── GET /api/costs/breakdown ──

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withErrorHandler(async (_request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();

  const breakdowns = await prisma.costBreakdown.findMany({
    where: { projectId },
    include: { subcategories: true },
    orderBy: { total: "desc" },
  });

  return apiResponse({ breakdowns });
});
