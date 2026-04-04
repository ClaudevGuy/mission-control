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
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const updateMemberRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "DEVELOPER", "AGENT_MANAGER", "VIEWER"]),
});

const removeMemberSchema = z.object({
  userId: z.string().min(1),
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
  const user = await requireRole("admin");
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

  await logAuditEvent({
    projectId,
    userId: user.id,
    userName: user.name,
    action: "team.update_role",
    target: member.user?.email || body.userId,
    details: `Changed role for ${member.user?.name || body.userId} to ${body.role}`,
  });

  return apiResponse(member);
});

// ── DELETE /api/team/members ──

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const user = await requireRole("admin");
  const projectId = await getProjectId();
  const body = await validateBody(request, removeMemberSchema);

  if (body.userId === user.id) {
    return apiError("You cannot remove yourself", 400);
  }

  const existing = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: body.userId, projectId } },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!existing) {
    return apiError("Member not found", 404);
  }

  await prisma.projectMember.delete({
    where: { userId_projectId: { userId: body.userId, projectId } },
  });

  await logAuditEvent({
    projectId,
    userId: user.id,
    userName: user.name,
    action: "team.remove_member",
    target: existing.user?.email || body.userId,
    details: `Removed ${existing.user?.name || body.userId} from the project`,
  });

  return apiResponse({ success: true });
});
