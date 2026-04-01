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

const createAlertRuleSchema = z.object({
  name: z.string().min(1).max(200),
  metric: z.string().min(1),
  condition: z.enum(["GT", "LT", "EQ"]),
  threshold: z.number(),
  duration: z.string().min(1),
  channels: z.array(z.enum(["SLACK", "EMAIL", "PAGERDUTY"])).min(1),
  enabled: z.boolean().optional().default(true),
});

// ── GET /api/alert-rules ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const [rules, total] = await Promise.all([
    prisma.alertRule.findMany({
      where: { projectId },
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.alertRule.count({ where: { projectId } }),
  ]);

  return apiResponse({
    rules,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── POST /api/alert-rules ──

export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireRole("developer");
  const projectId = await getProjectId();
  const body = await validateBody(request, createAlertRuleSchema);

  const rule = await prisma.alertRule.create({
    data: {
      projectId,
      name: body.name,
      metric: body.metric,
      condition: body.condition as never,
      threshold: body.threshold,
      duration: body.duration,
      channels: body.channels as never[],
      enabled: body.enabled,
    },
  });

  return apiResponse(rule, 201);
});
