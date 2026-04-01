import { NextRequest } from "next/server";
import {
  withErrorHandler,
  requireRole,
  apiResponse,
  apiError,
} from "@/lib/api-helpers";
import { execSync } from "child_process";

// ── POST /api/seed ──

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withErrorHandler(async (_request: NextRequest) => {
  if (process.env.NODE_ENV !== "development") {
    return apiError("Seeding is only available in development", 403);
  }

  await requireRole("admin");

  try {
    execSync("npx prisma db seed", {
      cwd: process.cwd(),
      timeout: 60000,
      stdio: "pipe",
    });

    return apiResponse({ success: true, message: "Database re-seeded successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Seed failed";
    return apiError(message, 500);
  }
});
