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

const connectIntegrationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().default(""),
  icon: z.string().optional().default("plug"),
  category: z.enum([
    "SOURCE_CONTROL",
    "COMMUNICATION",
    "DEPLOYMENT",
    "MONITORING",
    "AI",
    "DATABASE",
    "PAYMENT",
    "AUTOMATION",
  ]),
  config: z.record(z.string(), z.unknown()).optional(),
});

// ── GET /api/integrations ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const status = searchParams.get("status");
  const category = searchParams.get("category");

  const where = {
    projectId,
    ...(status && { status: status.toUpperCase() as never }),
    ...(category && { category: category.toUpperCase() as never }),
  };

  const [integrations, total] = await Promise.all([
    prisma.integration.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.integration.count({ where }),
  ]);

  return apiResponse({
    integrations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── POST /api/integrations ──

export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireRole("admin");
  const projectId = await getProjectId();
  const body = await validateBody(request, connectIntegrationSchema);

  const integration = await prisma.integration.create({
    data: {
      projectId,
      name: body.name,
      description: body.description,
      icon: body.icon,
      status: "CONNECTED" as never,
      category: body.category as never,
      connectedAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: body.config as any,
    },
  });

  return apiResponse(integration, 201);
});
