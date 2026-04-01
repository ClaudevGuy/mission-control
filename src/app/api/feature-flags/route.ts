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
import { z } from "zod";

const createFeatureFlagSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().default(""),
  environments: z.record(z.string(), z.boolean()).optional().default({}),
});

// ── GET /api/feature-flags ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const [flags, total] = await Promise.all([
    prisma.featureFlag.findMany({
      where: { projectId },
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.featureFlag.count({ where: { projectId } }),
  ]);

  return apiResponse({
    flags,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── POST /api/feature-flags ──

export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireRole("developer");
  const projectId = await getProjectId();
  const body = await validateBody(request, createFeatureFlagSchema);

  const flag = await prisma.featureFlag.create({
    data: {
      projectId,
      name: body.name,
      description: body.description,
      environments: body.environments,
    },
  });

  return apiResponse(flag, 201);
});
