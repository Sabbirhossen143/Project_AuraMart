
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { createUser } from "@/repositories/user.repository";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid registration data",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.data;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const now = new Date().toISOString();

    // Create user
    const user = {
      id: randomUUID(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "USER" as const,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const createdUser = await createUser(user);

    // Never return password
    const { password: _, ...safeUser } = createdUser;

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        data: safeUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    if (
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505"
) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Registration failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
