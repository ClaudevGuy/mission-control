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

const updateWebhookSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
});

// ── PATCH /api/webhooks/[id] ──

export const PATCH = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireRole("admin");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Webhook ID is required", 400);

    const existing = await prisma.webhook.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("Webhook not found", 404);

    const body = await validateBody(request, updateWebhookSchema);

    const webhook = await prisma.webhook.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status as never }),
        ...(body.url !== undefined && { url: body.url }),
        ...(body.events !== undefined && { events: body.events }),
      },
    });

    return apiResponse(webhook);
  }
);

// ── DELETE /api/webhooks/[id] ──

export const DELETE = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireRole("admin");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Webhook ID is required", 400);

    const existing = await prisma.webhook.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("Webhook not found", 404);

    await prisma.webhook.delete({ where: { id } });

    return apiResponse({ success: true, id });
  }
);
