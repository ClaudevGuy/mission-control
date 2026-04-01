import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  requireRole,
  getProjectId,
  apiResponse,
  parsePagination,
  validateBody,
} from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit";
import { deliverWebhook } from "@/lib/webhooks";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const createIncidentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  severity: z.enum(["P1", "P2", "P3"]),
  affectedServices: z.array(z.string()).optional().default([]),
  assigneeId: z.string().optional(),
});

// ── GET /api/incidents ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const severity = searchParams.get("severity");
  const status = searchParams.get("status");

  const where: Prisma.IncidentWhereInput = { projectId };

  if (severity) where.severity = severity.toUpperCase() as never;
  if (status) where.status = status.toUpperCase() as never;

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    prisma.incident.count({ where }),
  ]);

  return apiResponse({
    incidents,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── POST /api/incidents ──

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireRole("developer");
  const projectId = await getProjectId();
  const body = await validateBody(request, createIncidentSchema);

  const incident = await prisma.incident.create({
    data: {
      projectId,
      title: body.title,
      description: body.description,
      severity: body.severity as never,
      affectedServices: body.affectedServices,
      assigneeId: body.assigneeId,
      timeline: [{ event: "Incident created", timestamp: new Date().toISOString() }],
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  await logAuditEvent({
    projectId,
    userId: user.id,
    userName: user.name,
    action: "incident.create",
    target: incident.title,
    details: `Created ${body.severity} incident: "${incident.title}"`,
  });

  // Fire webhook for incident created
  deliverWebhook({
    projectId,
    event: "incident.created",
    payload: incident,
  }).catch(() => {});

  return apiResponse(incident, 201);
});
