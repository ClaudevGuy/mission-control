import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { prisma } from "@/lib/prisma";
import { ZodSchema, ZodError } from "zod";

// ── Types ──

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  activeProjectId: string;
}

// ── Auth helpers ──

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new ApiError("Unauthorized", 401);
  }
  return session.user as SessionUser;
}

export async function requireRole(minimumRole: "viewer" | "developer" | "agent_manager" | "admin") {
  const user = await requireAuth();
  const roleHierarchy = { viewer: 0, developer: 1, agent_manager: 2, admin: 3 };
  const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] ?? 0;
  const requiredLevel = roleHierarchy[minimumRole];

  if (userLevel < requiredLevel) {
    throw new ApiError("Insufficient permissions", 403);
  }
  return user;
}

export async function getProjectId() {
  const user = await requireAuth();
  return user.activeProjectId;
}

// ── Response helpers ──

export function apiResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ── Error class ──

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// ── Request parsing ──

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function parseSort(searchParams: URLSearchParams, allowedFields: string[]) {
  const sortBy = searchParams.get("sortBy") || "";
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";
  if (allowedFields.includes(sortBy)) {
    return { [sortBy]: sortDir };
  }
  return { createdAt: "desc" as const };
}

// ── Validation ──

export async function validateBody<T>(request: NextRequest, schema: ZodSchema<T>): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(`Validation error: ${error.issues.map((e) => e.message).join(", ")}`, 422);
    }
    throw new ApiError("Invalid request body", 400);
  }
}

// ── Route handler wrapper ──

type RouteHandler = (request: NextRequest, context?: { params: Record<string, string> }) => Promise<NextResponse>;

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return apiError(error.message, error.status);
      }
      console.error("Unhandled API error:", error);
      return apiError("Internal server error", 500);
    }
  };
}
