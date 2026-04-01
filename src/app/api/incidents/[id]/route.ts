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
import { z } from "zod";

const updateIncidentSchema = z.object({
  status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED"]).optional(),
  assigneeId: z.string().nullable().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  severity: z.enum(["P1", "P2", "P3"]).optional(),
});

// ── GET /api/incidents/[id] ──

export const GET = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireAuth();
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Incident ID is required", 400);

    const incident = await prisma.incident.findFirst({
      where: { id, projectId },
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!incident) throw new ApiError("Incident not found", 404);

    return apiResponse(incident);
  }
);

// ── PATCH /api/incidents/[id] ──

export const PATCH = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireRole("developer");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Incident ID is required", 400);

    const existing = await prisma.incident.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("Incident not found", 404);

    const body = await validateBody(request, updateIncidentSchema);

    const incident = await prisma.incident.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status as never }),
        ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.severity !== undefined && { severity: body.severity as never }),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    return apiResponse(incident);
  }
);
