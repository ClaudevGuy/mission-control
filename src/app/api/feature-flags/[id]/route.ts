import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireRole,
  getProjectId,
  apiResponse,
  apiError,
  ApiError,
  validateBody,
} from "@/lib/api-helpers";
import { z } from "zod";

const updateFeatureFlagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  environments: z.record(z.string(), z.boolean()).optional(),
});

// ── PATCH /api/feature-flags/[id] ──

export const PATCH = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireRole("developer");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Feature flag ID is required", 400);

    const existing = await prisma.featureFlag.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("Feature flag not found", 404);

    const body = await validateBody(request, updateFeatureFlagSchema);

    const flag = await prisma.featureFlag.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.environments !== undefined && { environments: body.environments }),
      },
    });

    return apiResponse(flag);
  }
);

// ── DELETE /api/feature-flags/[id] ──

export const DELETE = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireRole("admin");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Feature flag ID is required", 400);

    const existing = await prisma.featureFlag.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("Feature flag not found", 404);

    await prisma.featureFlag.delete({ where: { id } });

    return apiResponse({ success: true, id });
  }
);
