import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import {
  withErrorHandler,
  requireRole,
  getProjectId,
  apiResponse,
  apiError,
} from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit";

// ── POST /api/agents/kill-all ──
// Stops all currently running agents for this project.

export const POST = withErrorHandler(async () => {
  const user = await requireRole("developer");
  // Rate limit: 5 kill-all calls per minute per user (destructive action)
  // NOTE: x-forwarded-for can be spoofed without a trusted reverse proxy — user.id is the real guard
  const ip = (await headers()).get("x-forwarded-for") ?? "anon";
  const rl = rateLimit(`kill-all:${user.id}:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.success) {
    return apiError("Rate limit exceeded — max 5 kill-all calls per minute", 429);
  }
  const projectId = await getProjectId();

  const { count } = await prisma.agent.updateMany({
    where: { projectId, status: "RUNNING" },
    data: { status: "IDLE" },
  });

  await logAuditEvent({
    projectId,
    userId: user.id,
    userName: user.name,
    action: "agent.kill_all",
    target: "all agents",
    details: `Emergency kill switch activated — stopped ${count} running agent(s)`,
  });

  return apiResponse({ stopped: count });
});
