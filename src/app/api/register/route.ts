import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    // Check if registration is allowed
    if (process.env.ALLOW_REGISTRATION === "false") {
      return NextResponse.json(
        { error: "Registration is disabled" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password } = registerSchema.parse(body);

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "ADMIN", // First user gets admin
      },
    });

    // Create a default project for the user
    const project = await prisma.project.create({
      data: {
        name: "Mission Control",
        description: "Default project",
      },
    });

    // Add user as admin of the project
    await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId: project.id,
        role: "ADMIN",
      },
    });

    return NextResponse.json(
      { data: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((e) => e.message).join(", ") },
        { status: 422 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
