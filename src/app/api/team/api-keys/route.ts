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
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";
import crypto from "crypto";

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  scopes: z.array(z.string()).min(1, "At least one scope is required"),
  expiresIn: z.enum(["30d", "90d", "1y", "never"]).optional().default("never"),
});

// ── GET /api/team/api-keys ──

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);

  const [keys, total] = await Promise.all([
    prisma.apiKey.findMany({
      where: { projectId, status: "active" },
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
        expiresAt: true,
        status: true,
        revokedAt: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.apiKey.count({ where: { projectId, status: "active" } }),
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

  // Calculate expiry
  let expiresAt: Date | null = null;
  if (body.expiresIn === "30d") expiresAt = new Date(Date.now() + 30 * 86400000);
  else if (body.expiresIn === "90d") expiresAt = new Date(Date.now() + 90 * 86400000);
  else if (body.expiresIn === "1y") expiresAt = new Date(Date.now() + 365 * 86400000);

  const apiKey = await prisma.apiKey.create({
    data: {
      projectId,
      name: body.name,
      prefix,
      hashedKey,
      scopes: body.scopes,
      expiresAt,
      createdById: user.id,
    },
  });

  await logAuditEvent({
    projectId,
    userId: user.id,
    userName: user.name,
    action: "api_key.create",
    target: body.name,
    details: `Created API key "${body.name}" with scopes: ${body.scopes.join(", ") || "all"}`,
  });

  // Return plaintext key only once
  return apiResponse(
    {
      key: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        rawKey,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    },
    201
  );
});
