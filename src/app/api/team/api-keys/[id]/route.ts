import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireRole,
  getProjectId,
  apiResponse,
  apiError,
  ApiError,
} from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit";

// ── DELETE /api/team/api-keys/[id] ──

export const DELETE = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const user = await requireRole("admin");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("API key ID is required", 400);

    const existing = await prisma.apiKey.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("API key not found", 404);

    await prisma.apiKey.update({
      where: { id },
      data: { status: "revoked", revokedAt: new Date() },
    });

    await logAuditEvent({
      projectId,
      userId: user.id,
      userName: user.name,
      action: "api_key.revoke",
      target: existing.name,
      details: `Revoked API key "${existing.name}" (${existing.prefix}...)`,
    });

    return apiResponse({ success: true, id });
  }
);
