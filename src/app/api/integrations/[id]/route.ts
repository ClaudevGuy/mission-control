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

const updateIntegrationSchema = z.object({
  status: z.enum(["CONNECTED", "DISCONNECTED", "ERROR"]).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

// ── PATCH /api/integrations/[id] ──

export const PATCH = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireRole("admin");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Integration ID is required", 400);

    const existing = await prisma.integration.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("Integration not found", 404);

    const body = await validateBody(request, updateIntegrationSchema);

    const integration = await prisma.integration.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status as never }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(body.config !== undefined && { config: body.config as any }),
        ...(body.status === "CONNECTED" && { connectedAt: new Date() }),
      },
    });

    return apiResponse(integration);
  }
);

// ── DELETE /api/integrations/[id] ──

export const DELETE = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireRole("admin");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Integration ID is required", 400);

    const existing = await prisma.integration.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("Integration not found", 404);

    await prisma.integration.delete({ where: { id } });

    return apiResponse({ success: true, id });
  }
);
