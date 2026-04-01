import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  requireRole,
  getProjectId,
  apiResponse,
  ApiError,
  validateBody,
} from "@/lib/api-helpers";
import { z } from "zod";

const updateSettingsSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  timezone: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

// ── GET /api/settings ──

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withErrorHandler(async (_request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      timezone: true,
      settings: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!project) throw new ApiError("Project not found", 404);

  return apiResponse(project);
});

// ── PATCH /api/settings ──

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  await requireRole("admin");
  const projectId = await getProjectId();
  const body = await validateBody(request, updateSettingsSchema);

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.timezone !== undefined && { timezone: body.timezone }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(body.settings !== undefined && { settings: body.settings as any }),
    },
  });

  return apiResponse(project);
});
