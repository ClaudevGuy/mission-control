import { prisma } from "@/lib/prisma";

export async function logAuditEvent(params: {
  projectId: string;
  userId: string;
  userName: string;
  action: string;     // e.g., "agent.create", "deployment.rollback", "settings.update"
  target: string;     // e.g., "CodeReviewer", "api-gateway v2.14.3"
  details: string;    // Human-readable description
}): Promise<void> {
  await prisma.auditLogEntry.create({
    data: {
      projectId: params.projectId,
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      target: params.target,
      details: params.details,
    },
  });
}
