import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Authenticates API requests using an API key.
 * Header: Authorization: Bearer mc_xxx_xxxxxxxx
 * Looks up the key in the ApiKey table, verifies hash, checks scopes.
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<{
  userId: string;
  projectId: string;
  scopes: string[];
} | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith("mc_")) {
    return null;
  }

  const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { hashedKey },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!apiKey || apiKey.status !== "active") {
    return null;
  }

  // Update lastUsed timestamp (fire and forget)
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsed: new Date() } })
    .catch(() => {});

  return {
    userId: apiKey.createdById,
    projectId: apiKey.projectId,
    scopes: apiKey.scopes,
  };
}
