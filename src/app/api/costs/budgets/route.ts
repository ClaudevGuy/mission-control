import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandler,
  requireAuth,
  requireRole,
  getProjectId,
  apiResponse,
  ApiError,
  validateBody,
} from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

// ── Schemas ──

const createSchema = z.object({
  category: z.string().min(1).max(50),
  limit: z.number().min(0),
  alertThreshold: z.number().min(0).max(1).optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  limit: z.number().min(0).optional(),
  alertThreshold: z.number().min(0).max(1).optional(),
});

// ── Helpers ──

function firstOfMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Monthly spend = sum of all LlmCall costs for the project in the current
 * calendar month. All budgets track against this same denominator; per-
 * category split is a future refinement.
 */
async function getMonthlySpend(projectId: string): Promise<number> {
  const agg = await prisma.llmCall.aggregate({
    where: { projectId, timestamp: { gte: firstOfMonth() } },
    _sum: { cost: true },
  });
  return agg._sum.cost ?? 0;
}

// ── GET /api/costs/budgets ──

export const GET = withErrorHandler(async () => {
  await requireAuth();
  const projectId = await getProjectId();

  const [budgets, spent] = await Promise.all([
    prisma.budget.findMany({
      where: { projectId },
      orderBy: { category: "asc" },
    }),
    getMonthlySpend(projectId),
  ]);

  // Normalize field names to match frontend types and inject live `spent`.
  const shaped = budgets.map((b) => ({
    id: b.id,
    category: b.category,
    limit: b.budgetLimit,
    spent,                          // live, not stored
    alertThreshold: b.alertThreshold,
  }));

  return apiResponse({ budgets: shaped });
});

// ── POST /api/costs/budgets ──
// Create a new budget (or replace an existing one for the same category).

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireRole("admin");
  const projectId = await getProjectId();
  const body = await validateBody(request, createSchema);

  const existing = await prisma.budget.findFirst({
    where: { projectId, category: body.category },
  });

  const data = {
    budgetLimit: body.limit,
    alertThreshold: body.alertThreshold ?? 0.8,
  };

  const budget = existing
    ? await prisma.budget.update({ where: { id: existing.id }, data })
    : await prisma.budget.create({
        data: { projectId, category: body.category, ...data },
      });

  await logAuditEvent({
    projectId,
    userId: user.id,
    userName: user.name,
    action: existing ? "budget.update" : "budget.create",
    target: body.category,
    details:
      `Budget "${body.category}" set to $${body.limit.toFixed(2)}/mo ` +
      `(alert at ${Math.round((budget.alertThreshold) * 100)}%)`,
  });

  return apiResponse(
    {
      id: budget.id,
      category: budget.category,
      limit: budget.budgetLimit,
      alertThreshold: budget.alertThreshold,
    },
    existing ? 200 : 201
  );
});

// ── PATCH /api/costs/budgets ──
// Update limit and/or alertThreshold for an existing budget by id.

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const user = await requireRole("admin");
  const projectId = await getProjectId();
  const body = await validateBody(request, updateSchema);

  const existing = await prisma.budget.findFirst({
    where: { id: body.id, projectId },
  });
  if (!existing) throw new ApiError("Budget not found", 404);

  const budget = await prisma.budget.update({
    where: { id: body.id },
    data: {
      ...(body.limit !== undefined && { budgetLimit: body.limit }),
      ...(body.alertThreshold !== undefined && {
        alertThreshold: body.alertThreshold,
      }),
    },
  });

  await logAuditEvent({
    projectId,
    userId: user.id,
    userName: user.name,
    action: "budget.update",
    target: budget.category,
    details:
      `Updated "${budget.category}" — $${budget.budgetLimit.toFixed(2)}/mo, ` +
      `alert at ${Math.round(budget.alertThreshold * 100)}%`,
  });

  return apiResponse({
    id: budget.id,
    category: budget.category,
    limit: budget.budgetLimit,
    alertThreshold: budget.alertThreshold,
  });
});

// ── DELETE /api/costs/budgets?id=xxx ──

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const user = await requireRole("admin");
  const projectId = await getProjectId();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) throw new ApiError("Budget id is required", 400);

  const existing = await prisma.budget.findFirst({
    where: { id, projectId },
  });
  if (!existing) throw new ApiError("Budget not found", 404);

  await prisma.budget.delete({ where: { id } });

  await logAuditEvent({
    projectId,
    userId: user.id,
    userName: user.name,
    action: "budget.delete",
    target: existing.category,
    details: `Removed budget "${existing.category}" ($${existing.budgetLimit.toFixed(2)}/mo)`,
  });

  return apiResponse({ ok: true });
});
