export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  getProjectId,
  ApiError,
} from "@/lib/api-helpers";

// ── GET /api/export/data ──
// Exports all project data as a single JSON file
// Used by the "Export All Data" button in Settings

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) throw new ApiError("Project not found", 404);

  // Fetch all project data in parallel
  const [
    agents,
    deployments,
    incidents,
    members,
    integrations,
    webhooks,
    featureFlags,
    costBreakdowns,
    agentCosts,
    budgets,
    logs,
    auditLog,
    apiKeys,
    alertRules,
  ] = await Promise.all([
    prisma.agent.findMany({
      where: { projectId },
      include: { tools: true, evalResults: true },
    }),
    prisma.deployment.findMany({
      where: { projectId },
      orderBy: { timestamp: "desc" },
      take: 500,
    }),
    prisma.incident.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }),
    prisma.integration.findMany({ where: { projectId } }),
    prisma.webhook.findMany({
      where: { projectId },
      select: {
        id: true,
        url: true,
        events: true,
        status: true,
        lastDelivery: true,
        successRate: true,
        // Exclude secret from export
      },
    }),
    prisma.featureFlag.findMany({ where: { projectId } }),
    prisma.costBreakdown.findMany({
      where: { projectId },
      include: { subcategories: true },
    }),
    prisma.agentCost.findMany({ where: { projectId } }),
    prisma.budget.findMany({ where: { projectId } }),
    prisma.logEntry.findMany({
      where: { projectId },
      orderBy: { timestamp: "desc" },
      take: 1000,
    }),
    prisma.auditLogEntry.findMany({
      where: { projectId },
      orderBy: { timestamp: "desc" },
      take: 1000,
    }),
    prisma.apiKey.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        createdAt: true,
        lastUsed: true,
        status: true,
        // Exclude hashedKey from export
      },
    }),
    prisma.alertRule.findMany({ where: { projectId } }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      timezone: project.timezone,
      settings: project.settings,
      createdAt: project.createdAt,
    },
    agents,
    deployments,
    incidents,
    team: members,
    integrations,
    webhooks,
    featureFlags,
    costs: {
      breakdowns: costBreakdowns,
      agentCosts,
      budgets,
    },
    logs,
    auditLog,
    apiKeys,
    alertRules,
  };

  const filename = `mission-control-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
