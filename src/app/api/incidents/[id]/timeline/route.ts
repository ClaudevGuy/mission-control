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

const addTimelineEventSchema = z.object({
  event: z.string().min(1),
  details: z.string().optional(),
});

// ── POST /api/incidents/[id]/timeline ──

export const POST = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const user = await requireRole("developer");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Incident ID is required", 400);

    const existing = await prisma.incident.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("Incident not found", 404);

    const body = await validateBody(request, addTimelineEventSchema);

    const currentTimeline = (existing.timeline as Record<string, unknown>[]) || [];
    const newTimeline = [
      ...currentTimeline,
      {
        event: body.event,
        details: body.details,
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
      },
    ];

    const incident = await prisma.incident.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { timeline: newTimeline as any },
    });

    return apiResponse(incident);
  }
);
