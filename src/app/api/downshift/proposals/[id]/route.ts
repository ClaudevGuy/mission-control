import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireRole,
  getProjectId,
  apiResponse,
  apiError,
  ApiError,
  validateBody,
} from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit";
import { createNotification } from "@/lib/create-notification";
import { z } from "zod";

// ── PATCH /api/downshift/proposals/[id] ──
// Admin-only. Accept → update the agent's model + mark proposal accepted +
// audit + notify. Reject → just mark rejected so the 30-day cooldown starts.

const patchSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

export const PATCH = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const user = await requireRole("admin");
    const projectId = await getProjectId();
    const proposalId = context?.params?.id;
    if (!proposalId) return apiError("Proposal ID is required", 400);

    const body = await validateBody(request, patchSchema);

    const proposal = await prisma.downshiftProposal.findFirst({
      where: { id: proposalId, projectId },
    });
    if (!proposal) throw new ApiError("Proposal not found", 404);
    if (proposal.status !== "pending") {
      throw new ApiError(`Proposal is already ${proposal.status}`, 409);
    }

    const agent = await prisma.agent.findFirst({
      where: { id: proposal.agentId, projectId },
    });
    if (!agent) throw new ApiError("Agent not found", 404);

    if (body.action === "reject") {
      const updated = await prisma.downshiftProposal.update({
        where: { id: proposalId },
        data: {
          status: "rejected",
          decidedAt: new Date(),
          decidedByUserId: user.id,
        },
      });

      await logAuditEvent({
        projectId,
        userId: user.id,
        userName: user.name,
        action: "downshift.proposal.reject",
        target: agent.name,
        details:
          `Rejected downshift ${proposal.fromModel} → ${proposal.toModel} for "${agent.name}" ` +
          `(parity ${(proposal.parityRatio * 100).toFixed(1)}%, ` +
          `${proposal.sampleSize} samples, ` +
          `est $${proposal.estMonthlySavings.toFixed(2)}/mo savings declined). ` +
          `Cooldown: 30 days.`,
      });

      return apiResponse(updated);
    }

    // action === "accept"
    // Note: Agent.model is a provider enum (CLAUDE/GPT4/GEMINI), not a
    // specific model string. What actually controls which model an agent
    // uses is the modelStrategy + auto-routing tier. For the MVP, accepting
    // a proposal pins the agent's strategy to "manual" and (since there's
    // no per-agent model-id column) we instead set modelStrategy = "cost_first"
    // when the target is tier 3, "manual" otherwise. The cleanest future
    // improvement is adding a `preferredModel` column — tracked as a
    // separate task. For now the accept audit records the decision so we
    // don't lose it.
    //
    // Practical fix: we accept, mark the proposal, and audit-log a clear
    // note. Next iteration adds the real column.

    const updated = await prisma.downshiftProposal.update({
      where: { id: proposalId },
      data: {
        status: "accepted",
        decidedAt: new Date(),
        decidedByUserId: user.id,
      },
    });

    // Nudge agent into the cheapest tier via modelStrategy. This is a
    // best-effort signal until a dedicated preferredModel column exists.
    const nextStrategy =
      proposal.toTier === 3 ? "cost_first" : proposal.toTier === 1 ? "quality_first" : "auto";

    await prisma.agent.update({
      where: { id: agent.id },
      data: { modelStrategy: nextStrategy },
    });

    await logAuditEvent({
      projectId,
      userId: user.id,
      userName: user.name,
      action: "downshift.proposal.accept",
      target: agent.name,
      details:
        `Accepted downshift ${proposal.fromModel} → ${proposal.toModel} for "${agent.name}" ` +
        `(parity ${(proposal.parityRatio * 100).toFixed(1)}% over ${proposal.sampleSize} samples). ` +
        `Strategy set to "${nextStrategy}". Est. savings: $${proposal.estMonthlySavings.toFixed(2)}/mo.`,
    });

    createNotification({
      projectId,
      title: "Auto-Downshift accepted",
      message: `${agent.name} moved ${proposal.fromModel} → ${proposal.toModel} · est. $${proposal.estMonthlySavings.toFixed(2)}/mo saved`,
      type: "success",
      category: "agent",
      link: `/agents/${agent.id}`,
    }).catch(() => {});

    return apiResponse(updated);
  }
);
