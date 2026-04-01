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
import { Prisma } from "@prisma/client";
import { z } from "zod";

const createDeploymentSchema = z.object({
  service: z.string().min(1),
  version: z.string().min(1),
  stage: z.enum(["DEV", "STAGING", "REVIEW", "PRODUCTION"]),
  status: z.enum(["SUCCESS", "FAILED", "IN_PROGRESS", "ROLLED_BACK", "PENDING"]).optional().default("PENDING"),
  duration: z.number().int().min(0).optional().default(0),
  triggeredBy: z.string().min(1),
  isAgent: z.boolean().optional().default(false),
  commitHash: z.string().min(1),
  changelog: z.string().optional().default(""),
  environment: z.enum(["DEVELOPMENT", "STAGING", "PRODUCTION"]),
});

// ── GET /api/deployments ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const env = searchParams.get("environment");
  const status = searchParams.get("status");
  const service = searchParams.get("service");

  const where: Prisma.DeploymentWhereInput = { projectId };

  if (env) where.environment = env.toUpperCase() as never;
  if (status) where.status = status.toUpperCase() as never;
  if (service) where.service = service;

  const [deployments, total] = await Promise.all([
    prisma.deployment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: "desc" },
    }),
    prisma.deployment.count({ where }),
  ]);

  return apiResponse({
    deployments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── POST /api/deployments ──

export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireRole("developer");
  const projectId = await getProjectId();
  const body = await validateBody(request, createDeploymentSchema);

  const deployment = await prisma.deployment.create({
    data: {
      projectId,
      service: body.service,
      version: body.version,
      stage: body.stage as never,
      status: body.status as never,
      duration: body.duration,
      triggeredBy: body.triggeredBy,
      isAgent: body.isAgent,
      commitHash: body.commitHash,
      changelog: body.changelog,
      environment: body.environment as never,
    },
  });

  return apiResponse(deployment, 201);
});
