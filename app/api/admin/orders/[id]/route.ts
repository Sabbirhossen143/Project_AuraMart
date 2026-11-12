
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/options";
import { updateOrderStatus } from "@/repositories/order.repository";

const statusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        { success: false, message: "Invalid order ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = statusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid order status.",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const order = await updateOrderStatus(
      id,
      validation.data.status
    );

    return NextResponse.json({
      success: true,
      message: "Order status updated successfully.",
      data: order,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Order not found.") {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 404 }
        );
      }

      if (
        error.message.startsWith(
          "Invalid order status transition:"
        )
      ) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 409 }
        );
      }
    }

    console.error("Update Order Status Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update order status." },
      { status: 500 }
    );
  }
}
