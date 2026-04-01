import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  requireRole,
  getProjectId,
  apiResponse,
  apiError,
  ApiError,
  validateBody,
} from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit";
import { deliverWebhook } from "@/lib/webhooks";
import { z } from "zod";

const updateDeploymentSchema = z.object({
  status: z.enum(["SUCCESS", "FAILED", "IN_PROGRESS", "ROLLED_BACK", "PENDING"]).optional(),
  duration: z.number().int().min(0).optional(),
});

// ── GET /api/deployments/[id] ──

export const GET = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireAuth();
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Deployment ID is required", 400);

    const deployment = await prisma.deployment.findFirst({
      where: { id, projectId },
    });

    if (!deployment) throw new ApiError("Deployment not found", 404);

    return apiResponse(deployment);
  }
);

// ── PATCH /api/deployments/[id] ──

export const PATCH = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const user = await requireRole("developer");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Deployment ID is required", 400);

    const existing = await prisma.deployment.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("Deployment not found", 404);

    const body = await validateBody(request, updateDeploymentSchema);

    const deployment = await prisma.deployment.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status as never }),
        ...(body.duration !== undefined && { duration: body.duration }),
      },
    });

    await logAuditEvent({
      projectId,
      userId: user.id,
      userName: user.name,
      action: "deployment.update",
      target: `${existing.service} ${existing.version}`,
      details: `Updated deployment ${existing.service} v${existing.version}${body.status ? ` status to ${body.status}` : ""}`,
    });

    // Fire webhook if deployment completed
    if (body.status === "SUCCESS" || body.status === "FAILED") {
      deliverWebhook({
        projectId,
        event: "deployment.completed",
        payload: deployment,
      }).catch(() => {});
    }

    return apiResponse(deployment);
  }
);
