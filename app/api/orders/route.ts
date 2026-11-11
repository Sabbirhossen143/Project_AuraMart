import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/options";
import {
  createOrder,
  getUserOrders,
} from "@/repositories/order.repository";

const orderSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().min(2).max(100),
    phone: z.string().min(7).max(20),
    address: z.string().min(5).max(250),
    city: z.string().min(2).max(100),
    postalCode: z.string().min(3).max(20),
    country: z.string().min(2).max(100),
  }),
  paymentMethod: z.literal("COD"),
});

// GET: Get user's order history
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const orders = await getUserOrders(session.user.id);

    return NextResponse.json({
      success: true,
      totalOrders: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Get Orders Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to retrieve orders." },
      { status: 500 }
    );
  }
}

// POST: Create order from cart
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = orderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid order information.",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const order = await createOrder(
      session.user.id,
      validation.data.shippingAddress
    );

    return NextResponse.json(
      {
        success: true,
        message: "Order placed successfully.",
        data: order,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Your cart is empty.") {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 400 }
        );
      }

      if (error.message.startsWith("Product not found:")) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 404 }
        );
      }

      if (error.message.startsWith("Insufficient stock")) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 409 }
        );
      }

      if (error.name === "TransactionCanceledException") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Order could not be completed. Cart or product stock may have changed. Please try again.",
          },
          { status: 409 }
        );
      }
    }

    console.error("Create Order Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to place order." },
      { status: 500 }
    );
  }
}