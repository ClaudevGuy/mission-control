import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireRole,
  getProjectId,
  apiResponse,
  apiError,
  ApiError,
  validateBody,
} from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";
import { getAdapter } from "@/lib/integrations/registry";
import { encrypt, decrypt } from "@/lib/encryption";

const updateIntegrationSchema = z.object({
  status: z.enum(["CONNECTED", "DISCONNECTED", "ERROR"]).optional(),
  config: z.record(z.string(), z.string()).optional(),
});

// ── PATCH /api/integrations/[id] ──

export const PATCH = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const user = await requireRole("admin");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Integration ID is required", 400);

    const existing = await prisma.integration.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("Integration not found", 404);

    const body = await validateBody(request, updateIntegrationSchema);

    // If new config is provided, test & encrypt it
    let encryptedConfig: Record<string, string> | undefined;
    if (body.config && Object.keys(body.config).length > 0) {
      const adapter = getAdapter(existing.name);
      if (adapter) {
        const result = await adapter.testConnection(body.config);
        if (!result.success) {
          return apiError(
            `Connection test failed: ${result.error || "Unknown error"}`,
            422
          );
        }
      }
      encryptedConfig = {};
      for (const [key, value] of Object.entries(body.config)) {
        encryptedConfig[key] = encrypt(value);
      }
    }

    const integration = await prisma.integration.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status as never }),
        ...(encryptedConfig !== undefined && { config: encryptedConfig }),
        ...(body.status === "CONNECTED" && { connectedAt: new Date() }),
      },
    });

    await logAuditEvent({
      projectId,
      userId: user.id,
      userName: user.name,
      action: "integration.update",
      target: existing.name,
      details: `Updated integration "${existing.name}"${body.status ? ` status to ${body.status}` : ""}`,
    });

    return apiResponse(integration);
  }
);

// ── POST /api/integrations/[id] (sync action) ──

export const POST = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    await requireRole("admin");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Integration ID is required", 400);

    const existing = await prisma.integration.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("Integration not found", 404);

    const adapter = getAdapter(existing.name);
    if (!adapter) {
      return apiError(`No adapter found for integration "${existing.name}"`, 400);
    }
    if (!adapter.sync) {
      return apiError(`Integration "${existing.name}" does not support sync`, 400);
    }

    // Decrypt config
    const rawConfig = (existing.config as Record<string, string>) || {};
    const decryptedConfig: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawConfig)) {
      try {
        decryptedConfig[key] = decrypt(value);
      } catch {
        decryptedConfig[key] = value; // fallback if not encrypted
      }
    }

    try {
      await adapter.sync(projectId, decryptedConfig);
    } catch (err) {
      // Update integration status to ERROR on sync failure
      await prisma.integration.update({
        where: { id },
        data: { status: "ERROR" as never },
      });
      return apiError(`Sync failed: ${(err as Error).message}`, 500);
    }

    // Update lastSync timestamp on success
    const integration = await prisma.integration.update({
      where: { id },
      data: { lastSync: new Date() },
    });

    return apiResponse(integration);
  }
);

// ── DELETE /api/integrations/[id] ──

export const DELETE = withErrorHandler(
  async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const user = await requireRole("admin");
    const projectId = await getProjectId();
    const id = context?.params?.id;

    if (!id) return apiError("Integration ID is required", 400);

    const existing = await prisma.integration.findFirst({
      where: { id, projectId },
    });

    if (!existing) throw new ApiError("Integration not found", 404);

    await prisma.integration.delete({ where: { id } });

    await logAuditEvent({
      projectId,
      userId: user.id,
      userName: user.name,
      action: "integration.disconnect",
      target: existing.name,
      details: `Disconnected and removed integration "${existing.name}"`,
    });

    return apiResponse({ success: true, id });
  }
);
