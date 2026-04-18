import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  requireRole,
  getProjectId,
  apiResponse,
  validateBody,
} from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

// ── GET /api/downshift/config ──
// Returns the project's auto-downshift config. Any authenticated member can
// read; only admins can update (see PUT below).

export const GET = withErrorHandler(async () => {
  await requireAuth();
  const projectId = await getProjectId();

  let config = await prisma.downshiftConfig.findUnique({
    where: { projectId },
  });

  // Lazy-create with defaults so the UI always has a row to bind to.
  if (!config) {
    config = await prisma.downshiftConfig.create({
      data: { projectId },
    });
  }

  return apiResponse(config);
});

// ── PUT /api/downshift/config ──
// Admin-only. Updates knobs. Upserts the row if missing.

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  sampleRatePercent: z.number().int().min(1).max(20).optional(),
  minSampleSize: z.number().int().min(10).max(10_000).optional(),
  parityThreshold: z.number().min(0.5).max(1).optional(),
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const user = await requireRole("admin");
  const projectId = await getProjectId();

  const body = await validateBody(request, updateSchema);

  const config = await prisma.downshiftConfig.upsert({
    where: { projectId },
    create: { projectId, ...body },
    update: body,
  });

  await logAuditEvent({
    projectId,
    userId: user.id,
    userName: user.name,
    action: "downshift.config.update",
    target: "DownshiftConfig",
    details:
      `Auto-Downshift ${config.enabled ? "enabled" : "disabled"} ` +
      `(sample ${config.sampleRatePercent}%, min ${config.minSampleSize}, ` +
      `parity ≥ ${config.parityThreshold})`,
  });

  return apiResponse(config);
});
