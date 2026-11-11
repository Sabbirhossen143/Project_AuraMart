
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/options";
import {
  getAllUsers,
  updateUserRole,
  updateUserStatus,
} from "@/repositories/user.repository";

const updateSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => data.role !== undefined || data.isActive !== undefined,
  { message: "At least one update field is required." }
);

async function verifyAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      ),
    };
  }

  if (session.user.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  return { session };
}

// GET: All users
export async function GET() {
  try {
    const auth = await verifyAdmin();
    if ("error" in auth) return auth.error;

    const users = await getAllUsers();

    return NextResponse.json({
      success: true,
      data: users,
      totalUsers: users.length,
    });
  } catch (error) {
    console.error("Admin users GET error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch users." },
      { status: 500 }
    );
  }
}

// PATCH: Update user role or account status
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error.issues[0]?.message || "Invalid data.",
        },
        { status: 400 }
      );
    }

    const { userId, role, isActive } = validation.data;
    const currentAdminId = auth.session.user.id;

    if (userId === currentAdminId) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot change your own role or account status.",
        },
        { status: 400 }
      );
    }

    const users = await getAllUsers();
    const targetUser = users.find((user) => user.id === userId);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    const removesActiveAdmin =
      targetUser.role === "ADMIN" &&
      targetUser.isActive &&
      (role === "USER" || isActive === false);

    if (removesActiveAdmin) {
      const activeAdmins = users.filter(
        (user) => user.role === "ADMIN" && user.isActive
      );

      if (activeAdmins.length <= 1) {
        return NextResponse.json(
          {
            success: false,
            message: "The last active admin cannot be demoted or deactivated.",
          },
          { status: 400 }
        );
      }
    }

    if (role !== undefined) {
      await updateUserRole(userId, role);
    }

    if (isActive !== undefined) {
      await updateUserStatus(userId, isActive);
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully.",
    });
  } catch (error) {
    console.error("Admin users PATCH error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update user." },
      { status: 500 }
    );
  }
}
