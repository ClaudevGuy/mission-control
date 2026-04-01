import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  requireRole,
  getProjectId,
  apiResponse,
  apiError,
  parsePagination,
  validateBody,
} from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";
import { getAdapter } from "@/lib/integrations/registry";
import { encrypt } from "@/lib/encryption";

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
  config: z.record(z.string(), z.string()).optional(),
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
  const user = await requireRole("admin");
  const projectId = await getProjectId();
  const body = await validateBody(request, connectIntegrationSchema);

  // If config is provided, test the connection via the adapter first
  if (body.config && Object.keys(body.config).length > 0) {
    const adapter = getAdapter(body.name);

    if (adapter) {
      const result = await adapter.testConnection(body.config);
      if (!result.success) {
        return apiError(
          `Connection test failed: ${result.error || "Unknown error"}`,
          422
        );
      }
    }

    // Encrypt credentials before storing
    const encryptedConfig: Record<string, string> = {};
    for (const [key, value] of Object.entries(body.config)) {
      encryptedConfig[key] = encrypt(value);
    }

    const integration = await prisma.integration.create({
      data: {
        projectId,
        name: body.name,
        description: body.description,
        icon: body.icon,
        status: "CONNECTED" as never,
        category: body.category as never,
        connectedAt: new Date(),
        config: encryptedConfig,
      },
    });

    await logAuditEvent({
      projectId,
      userId: user.id,
      userName: user.name,
      action: "integration.connect",
      target: body.name,
      details: `Connected integration "${body.name}" (${body.category})`,
    });

    return apiResponse(integration, 201);
  }

  // No config provided -- just create the record as disconnected
  const integration = await prisma.integration.create({
    data: {
      projectId,
      name: body.name,
      description: body.description,
      icon: body.icon,
      status: "DISCONNECTED" as never,
      category: body.category as never,
    },
  });

  await logAuditEvent({
    projectId,
    userId: user.id,
    userName: user.name,
    action: "integration.connect",
    target: body.name,
    details: `Created integration "${body.name}" (${body.category}, disconnected)`,
  });

  return apiResponse(integration, 201);
});
