import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireRole,
  getProjectId,
  apiResponse,
  apiError,
  validateBody,
} from "@/lib/api-helpers";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["ADMIN", "DEVELOPER", "AGENT_MANAGER", "VIEWER"]).optional().default("VIEWER"),
});

// ── POST /api/team/invite ──

export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireRole("admin");
  const projectId = await getProjectId();
  const body = await validateBody(request, inviteSchema);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (existingUser) {
    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: existingUser.id, projectId } },
    });

    if (existingMember) {
      return apiError("User is already a member of this project", 409);
    }

    // Add existing user to project
    const member = await prisma.projectMember.create({
      data: { userId: existingUser.id, projectId, role: body.role as never },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return apiResponse(member, 201);
  }

  // Create new user with temp password
  const tempPassword = crypto.randomBytes(16).toString("hex");
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      passwordHash,
      projectMembers: {
        create: { projectId, role: body.role as never },
      },
    },
    select: { id: true, name: true, email: true },
  });

  return apiResponse({ user, tempPassword }, 201);
});
