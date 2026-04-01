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
import { z } from "zod";

const createOnCallSchema = z.object({
  memberId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// ── GET /api/on-call ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const [schedules, total] = await Promise.all([
    prisma.onCallSchedule.findMany({
      where: { projectId },
      skip,
      take: limit,
      orderBy: { startDate: "asc" },
      include: {
        member: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    prisma.onCallSchedule.count({ where: { projectId } }),
  ]);

  return apiResponse({
    schedules,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── POST /api/on-call ──

export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireRole("admin");
  const projectId = await getProjectId();
  const body = await validateBody(request, createOnCallSchema);

  const schedule = await prisma.onCallSchedule.create({
    data: {
      projectId,
      memberId: body.memberId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    },
    include: {
      member: { select: { id: true, name: true, email: true } },
    },
  });

  return apiResponse(schedule, 201);
});
