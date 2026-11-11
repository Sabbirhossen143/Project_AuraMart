
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";
import { getAllOrders } from "@/repositories/order.repository";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized access.",
        },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required.",
        },
        { status: 403 }
      );
    }

    const orders = await getAllOrders();

    return NextResponse.json({
      success: true,
      message: "All orders retrieved successfully.",
      data: orders,
      totalOrders: orders.length,
    });
  } catch (error) {
    console.error("Get Admin Orders Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve orders.",
      },
      { status: 500 }
    );
  }
}
