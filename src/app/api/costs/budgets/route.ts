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
import { z } from "zod";

const updateBudgetSchema = z.object({
  id: z.string().min(1),
  budgetLimit: z.number().min(0).optional(),
  alertThreshold: z.number().min(0).max(1).optional(),
});

// ── GET /api/costs/budgets ──

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withErrorHandler(async (_request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();

  const budgets = await prisma.budget.findMany({
    where: { projectId },
    orderBy: { category: "asc" },
  });

  return apiResponse({ budgets });
});

// ── PATCH /api/costs/budgets ──

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  await requireRole("admin");
  const projectId = await getProjectId();
  const body = await validateBody(request, updateBudgetSchema);

  const existing = await prisma.budget.findFirst({
    where: { id: body.id, projectId },
  });

  if (!existing) throw new ApiError("Budget not found", 404);

  const budget = await prisma.budget.update({
    where: { id: body.id },
    data: {
      ...(body.budgetLimit !== undefined && { budgetLimit: body.budgetLimit }),
      ...(body.alertThreshold !== undefined && { alertThreshold: body.alertThreshold }),
    },
  });

  return apiResponse(budget);
});
