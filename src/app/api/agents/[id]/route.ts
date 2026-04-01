import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  requireRole,
  getProjectId,
  apiResponse,
  apiError,
  ApiError,
  validateBody,
} from "@/lib/api-helpers";
import { updateAgentSchema } from "@/lib/validations/agents";
import { logAuditEvent } from "@/lib/audit";

// ── GET /api/agents/[id] ──

export const GET = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireAuth();
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) {
      return apiError("Agent ID is required", 400);
    }

    const agent = await prisma.agent.findFirst({
      where: { id, projectId },
      include: {
        tools: true,
        runs: {
          orderBy: { startedAt: "desc" },
        },
        evalResults: true,
      },
    });

    if (!agent) {
      throw new ApiError("Agent not found", 404);
    }

    return apiResponse(agent);
  }
);

// ── PATCH /api/agents/[id] ──

export const PATCH = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const user = await requireRole("developer");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) {
      return apiError("Agent ID is required", 400);
    }

    // Verify agent exists and belongs to project
    const existing = await prisma.agent.findFirst({
      where: { id, projectId },
    });

    if (!existing) {
      throw new ApiError("Agent not found", 404);
    }

    const body = await validateBody(request, updateAgentSchema);

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.model !== undefined && { model: body.model as never }),
        ...(body.status !== undefined && { status: body.status as never }),
        ...(body.systemPrompt !== undefined && { systemPrompt: body.systemPrompt }),
        ...(body.temperature !== undefined && { temperature: body.temperature }),
        ...(body.maxTokens !== undefined && { maxTokens: body.maxTokens }),
        ...(body.tags !== undefined && { tags: body.tags }),
      },
      include: {
        tools: true,
        evalResults: true,
      },
    });

    await logAuditEvent({
      projectId,
      userId: user.id,
      userName: user.name,
      action: "agent.update",
      target: agent.name,
      details: `Updated agent "${agent.name}"`,
    });

    return apiResponse(agent);
  }
);

// ── DELETE /api/agents/[id] ──

export const DELETE = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const user = await requireRole("admin");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) {
      return apiError("Agent ID is required", 400);
    }

    // Verify agent exists and belongs to project
    const existing = await prisma.agent.findFirst({
      where: { id, projectId },
    });

    if (!existing) {
      throw new ApiError("Agent not found", 404);
    }

    // Hard delete (cascades to tools, runs, evals via schema)
    await prisma.agent.delete({ where: { id } });

    await logAuditEvent({
      projectId,
      userId: user.id,
      userName: user.name,
      action: "agent.delete",
      target: existing.name,
      details: `Deleted agent "${existing.name}"`,
    });

    return apiResponse({ success: true, id });
  }
);
