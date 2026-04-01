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
  parsePagination,
  validateBody,
} from "@/lib/api-helpers";
import { createRunSchema } from "@/lib/validations/agents";

// ── GET /api/agents/[id]/runs ──

export const GET = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireAuth();
    const projectId = await getProjectId();
    const agentId = context?.params?.id;

    if (!agentId) {
      return apiError("Agent ID is required", 400);
    }

    // Verify agent belongs to project
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, projectId },
      select: { id: true },
    });

    if (!agent) {
      throw new ApiError("Agent not found", 404);
    }

    const { searchParams } = request.nextUrl;
    const { page, limit, skip } = parsePagination(searchParams);

    const [runs, total] = await Promise.all([
      prisma.agentRun.findMany({
        where: { agentId },
        orderBy: { startedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.agentRun.count({ where: { agentId } }),
    ]);

    return apiResponse({
      runs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

// ── POST /api/agents/[id]/runs ──

export const POST = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireRole("developer");
    const projectId = await getProjectId();
    const agentId = context?.params?.id;

    if (!agentId) {
      return apiError("Agent ID is required", 400);
    }

    // Verify agent belongs to project
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, projectId },
      select: { id: true },
    });

    if (!agent) {
      throw new ApiError("Agent not found", 404);
    }

    await validateBody(request, createRunSchema);

    // Create a new run record (future: this would trigger actual LLM execution)
    const run = await prisma.agentRun.create({
      data: {
        agentId,
        startedAt: new Date(),
        duration: 0,
        status: "RUN_RUNNING",
        tokensUsed: 0,
        cost: 0,
        output: "Run initiated. Awaiting execution...",
      },
    });

    return apiResponse(run, 201);
  }
);
