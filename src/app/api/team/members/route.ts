import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  requireRole,
  getProjectId,
  apiResponse,
  apiError,
  parsePagination,
  validateBody,
} from "@/lib/api-helpers";
import { z } from "zod";

const updateMemberRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "DEVELOPER", "AGENT_MANAGER", "VIEWER"]),
});

// ── GET /api/team/members ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const [members, total] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId },
      skip,
      take: limit,
      orderBy: { joinedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            avatar: true,
            jobTitle: true,
            displayName: true,
            timezone: true,
          },
        },
      },
    }),
    prisma.projectMember.count({ where: { projectId } }),
  ]);

  return apiResponse({
    members,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── PATCH /api/team/members ──

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  await requireRole("admin");
  const projectId = await getProjectId();
  const body = await validateBody(request, updateMemberRoleSchema);

  const existing = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: body.userId, projectId } },
  });

  if (!existing) {
    return apiError("Member not found", 404);
  }

  const member = await prisma.projectMember.update({
    where: { userId_projectId: { userId: body.userId, projectId } },
    data: { role: body.role as never },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  return apiResponse(member);
});
