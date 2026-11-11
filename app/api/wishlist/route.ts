import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { z } from "zod";

import { authOptions } from "@/lib/auth/options";
import {
  addToWishlist,
  getWishlistItems,
  removeFromWishlist,
} from "@/repositories/wishlist.repository";

const wishlistSchema = z.object({
  productId: z.string().uuid("Invalid product ID."),
});

// GET: Get user's wishlist
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const items = await getWishlistItems(session.user.id);

    return NextResponse.json({
      success: true,
      totalItems: items.length,
      data: items,
    });
  } catch (error) {
    console.error("Get Wishlist Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to retrieve wishlist." },
      { status: 500 }
    );
  }
}

// POST: Add product to wishlist
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
    const validation = wishlistSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request data.",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const item = await addToWishlist(
      session.user.id,
      validation.data.productId
    );

    return NextResponse.json(
      {
        success: true,
        message: "Product added to wishlist successfully.",
        data: item,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Product not found."
    ) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 }
      );
    }

    if (
      error instanceof ConditionalCheckFailedException ||
      (error instanceof Error &&
        error.name === "ConditionalCheckFailedException")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Product is already in your wishlist.",
        },
        { status: 409 }
      );
    }

    console.error("Add to Wishlist Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to add product to wishlist." },
      { status: 500 }
    );
  }
}

// DELETE: Remove product from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const productId = request.nextUrl.searchParams.get("productId");

    const validation = wishlistSchema.safeParse({ productId });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Invalid product ID." },
        { status: 400 }
      );
    }

    await removeFromWishlist(
      session.user.id,
      validation.data.productId
    );

    return NextResponse.json({
      success: true,
      message: "Product removed from wishlist successfully.",
    });
  } catch (error) {
    if (
      error instanceof ConditionalCheckFailedException ||
      (error instanceof Error &&
        error.name === "ConditionalCheckFailedException")
    ) {
      return NextResponse.json(
        { success: false, message: "Wishlist item not found." },
        { status: 404 }
      );
    }

    console.error("Remove from Wishlist Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to remove product from wishlist." },
      { status: 500 }
    );
  }
}