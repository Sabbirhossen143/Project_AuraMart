
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/options";
import {
  getCartSummary,
  addToCart,
  updateCartQuantity,
  removeFromCart,
} from "@/repositories/cart.repository";

const addToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(99),
});


// GET USER CART
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please login first.",
        },
        { status: 401 }
      );
    }

    const cart = await getCartSummary(session.user.id);

    return NextResponse.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error("Get cart error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve cart.",
      },
      { status: 500 }
    );
  }
}

// ADD PRODUCT TO CART
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please login first.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const validation = addToCartSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid cart data.",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { productId, quantity } = validation.data;

    const cartItem = await addToCart(
      session.user.id,
      productId,
      quantity
    );

    return NextResponse.json(
      {
        success: true,
        message: "Product added to cart successfully.",
        data: cartItem,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add to cart error:", error);

    if (error instanceof Error) {
      if (error.message === "Product not found.") {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 404 }
        );
      }

      if (
        error.message === "Product is out of stock." ||
        error.message ===
          "Requested quantity exceeds available stock."
      ) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 409 }
        );
      }

      if (
        error.name === "ConditionalCheckFailedException"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Requested quantity exceeds available stock.",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to add product to cart.",
      },
      { status: 500 }
    );
  }
}


const updateCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(99),
});

// UPDATE CART ITEM
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const validation = updateCartSchema.safeParse(
      await request.json()
    );

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid cart data.",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { productId, quantity } = validation.data;

    const updatedItem = await updateCartQuantity(
      session.user.id,
      productId,
      quantity
    );

    return NextResponse.json({
      success: true,
      message: "Cart quantity updated successfully.",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Update cart error:", error);

    if (error instanceof Error) {
      if (error.message === "Product not found.") {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 404 }
        );
      }

      if (
        error.message ===
        "Requested quantity exceeds available stock."
      ) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 409 }
        );
      }

      if (
        error.name === "ConditionalCheckFailedException"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Cart item not found.",
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { success: false, message: "Cart update failed." },
      { status: 500 }
    );
  }
}


const removeCartSchema = z.object({
  productId: z.string().uuid(),
});

// REMOVE CART ITEM
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const validation = removeCartSchema.safeParse({
      productId: request.nextUrl.searchParams.get("productId"),
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid productId is required.",
        },
        { status: 400 }
      );
    }

    const { productId } = validation.data;

    await removeFromCart(session.user.id, productId);

    return NextResponse.json({
      success: true,
      message: "Product removed from cart successfully.",
    });
  } catch (error) {
    console.error("Remove cart item error:", error);

    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return NextResponse.json(
        { success: false, message: "Cart item not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to remove cart item." },
      { status: 500 }
    );
  }
}

