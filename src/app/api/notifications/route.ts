import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  apiResponse,
  parsePagination,
  validateBody,
} from "@/lib/api-helpers";
import { z } from "zod";

const markReadSchema = z.object({
  ids: z.array(z.string()).min(1),
});

// ── GET /api/notifications ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const unreadOnly = searchParams.get("unread") === "true";

  const where = {
    projectId,
    userId: user.id,
    ...(unreadOnly && { read: false }),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: "desc" },
    }),
    prisma.notification.count({ where }),
  ]);

  return apiResponse({
    notifications,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── PATCH /api/notifications ──

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();
  const projectId = await getProjectId();
  const body = await validateBody(request, markReadSchema);

  await prisma.notification.updateMany({
    where: {
      id: { in: body.ids },
      projectId,
      userId: user.id,
    },
    data: { read: true },
  });

  return apiResponse({ success: true, updated: body.ids.length });
});
