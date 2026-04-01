import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  requireRole,
  getProjectId,
  apiResponse,
  parsePagination,
  validateBody,
} from "@/lib/api-helpers";
import { createAgentSchema } from "@/lib/validations/agents";
import { Prisma } from "@prisma/client";

// ── GET /api/agents ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  // Filters
  const status = searchParams.get("status");
  const model = searchParams.get("model");
  const search = searchParams.get("search");

  const where: Prisma.AgentWhereInput = { projectId };

  if (status) {
    where.status = status.toUpperCase() as never;
  }
  if (model) {
    where.model = model.toUpperCase() as never;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { tags: { hasSome: [search.toLowerCase()] } },
    ];
  }

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        tools: true,
        runs: {
          orderBy: { startedAt: "desc" },
          take: 5,
        },
        evalResults: true,
      },
    }),
    prisma.agent.count({ where }),
  ]);

  return apiResponse({
    agents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ── POST /api/agents ──

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireRole("developer");
  const projectId = await getProjectId();
  const body = await validateBody(request, createAgentSchema);

  const agent = await prisma.agent.create({
    data: {
      projectId,
      name: body.name,
      description: body.description,
      model: body.model as never,
      systemPrompt: body.systemPrompt,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      tags: body.tags,
      createdBy: user.id,
      tools: {
        create: body.tools.map((t) => ({
          name: t.name,
          enabled: t.enabled,
        })),
      },
    },
    include: {
      tools: true,
    },
  });

  return apiResponse(agent, 201);
});
