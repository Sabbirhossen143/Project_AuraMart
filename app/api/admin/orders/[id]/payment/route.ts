
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/options";
import { markCodPaymentAsPaid } from "@/repositories/order.repository";

export async function POST(
  _request: NextRequest,
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

    const order = await markCodPaymentAsPaid(id);

    return NextResponse.json({
      success: true,
      message: "COD payment accepted successfully.",
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
        error.message === "Only COD orders can be accepted." ||
        error.message === "Only delivered orders can be marked as paid." ||
        error.message === "Payment is already processed."
      ) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 409 }
        );
      }
    }

    console.error("Accept COD Payment Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to accept COD payment." },
      { status: 500 }
    );
  }
}
