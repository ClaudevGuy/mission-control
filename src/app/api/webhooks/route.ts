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
import crypto from "crypto";

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

// ── GET /api/webhooks ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const [webhooks, total] = await Promise.all([
    prisma.webhook.findMany({
      where: { projectId },
      skip,
      take: limit,
      orderBy: { url: "asc" },
    }),
    prisma.webhook.count({ where: { projectId } }),
  ]);

  return apiResponse({
    webhooks,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── POST /api/webhooks ──

export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireRole("admin");
  const projectId = await getProjectId();
  const body = await validateBody(request, createWebhookSchema);

  const secret = crypto.randomBytes(32).toString("hex");

  const webhook = await prisma.webhook.create({
    data: {
      projectId,
      url: body.url,
      events: body.events,
      secret,
    },
  });

  return apiResponse(webhook, 201);
});
