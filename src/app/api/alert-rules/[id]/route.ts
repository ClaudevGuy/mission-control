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

const updateAlertRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  metric: z.string().min(1).optional(),
  condition: z.enum(["GT", "LT", "EQ"]).optional(),
  threshold: z.number().optional(),
  duration: z.string().min(1).optional(),
  channels: z.array(z.enum(["SLACK", "EMAIL", "PAGERDUTY"])).optional(),
  enabled: z.boolean().optional(),
});

// ── PATCH /api/alert-rules/[id] ──

export const PATCH = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireRole("developer");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Alert rule ID is required", 400);

    const existing = await prisma.alertRule.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("Alert rule not found", 404);

    const body = await validateBody(request, updateAlertRuleSchema);

    const rule = await prisma.alertRule.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.metric !== undefined && { metric: body.metric }),
        ...(body.condition !== undefined && { condition: body.condition as never }),
        ...(body.threshold !== undefined && { threshold: body.threshold }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.channels !== undefined && { channels: body.channels as never[] }),
        ...(body.enabled !== undefined && { enabled: body.enabled }),
      },
    });

    return apiResponse(rule);
  }
);

// ── DELETE /api/alert-rules/[id] ──

export const DELETE = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireRole("admin");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Alert rule ID is required", 400);

    const existing = await prisma.alertRule.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("Alert rule not found", 404);

    await prisma.alertRule.delete({ where: { id } });

    return apiResponse({ success: true, id });
  }
);
