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

const updateServiceSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["HEALTHY", "DEGRADED", "DOWN"]).optional(),
  latency: z.number().optional(),
});

// ── GET /api/infrastructure/services ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;

  const status = searchParams.get("status");

  const where = {
    projectId,
    ...(status && { status: status.toUpperCase() as never }),
  };

  const services = await prisma.serviceNode.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return apiResponse({ services });
});

// ── PATCH /api/infrastructure/services ──

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  await requireRole("developer");
  const projectId = await getProjectId();
  const body = await validateBody(request, updateServiceSchema);

  const existing = await prisma.serviceNode.findFirst({
    where: { id: body.id, projectId },
  });

  if (!existing) throw new ApiError("Service not found", 404);

  const service = await prisma.serviceNode.update({
    where: { id: body.id },
    data: {
      ...(body.status !== undefined && { status: body.status as never }),
      ...(body.latency !== undefined && { latency: body.latency }),
    },
  });

  return apiResponse(service);
});
