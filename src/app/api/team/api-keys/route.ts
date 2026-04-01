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

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).optional().default([]),
});

// ── GET /api/team/api-keys ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const [keys, total] = await Promise.all([
    prisma.apiKey.findMany({
      where: { projectId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        createdAt: true,
        lastUsed: true,
        status: true,
        revokedAt: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.apiKey.count({ where: { projectId } }),
  ]);

  return apiResponse({
    keys,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── POST /api/team/api-keys ──

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireRole("admin");
  const projectId = await getProjectId();
  const body = await validateBody(request, createApiKeySchema);

  // Generate a random key
  const rawKey = `mc_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = rawKey.slice(0, 8);
  const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.apiKey.create({
    data: {
      projectId,
      name: body.name,
      prefix,
      hashedKey,
      scopes: body.scopes,
      createdById: user.id,
    },
  });

  // Return plaintext key only once
  return apiResponse(
    {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      key: rawKey,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
    },
    201
  );
});
