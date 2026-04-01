export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  ApiError,
} from "@/lib/api-helpers";

// ── GET /api/export/logs ──
// Returns logs as a JSON download with pagination support for large datasets

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;

  const level = searchParams.get("level");
  const service = searchParams.get("service");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(10000, parseInt(searchParams.get("limit") || "5000", 10));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { projectId };

  if (level) where.level = level.toUpperCase();
  if (service) where.service = service;
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from);
    if (to) where.timestamp.lte = new Date(to);
  }

  const total = await prisma.logEntry.count({ where });
  if (total === 0) {
    throw new ApiError("No logs found matching the given filters", 404);
  }

  // Stream logs in batches to handle large datasets
  const batchSize = 500;
  const batches = Math.ceil(Math.min(total, limit) / batchSize);
  const allLogs = [];

  for (let i = 0; i < batches; i++) {
    const batch = await prisma.logEntry.findMany({
      where,
      skip: i * batchSize,
      take: batchSize,
      orderBy: { timestamp: "desc" },
    });
    allLogs.push(...batch);
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    projectId,
    totalRecords: allLogs.length,
    filters: { level, service, from, to },
    entries: allLogs,
  };

  const filename = `logs-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
