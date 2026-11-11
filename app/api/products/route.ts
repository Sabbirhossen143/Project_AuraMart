
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

import {
  createProduct,
  getProductById,
  getAllProducts,
  getProductsByCategory,
  updateProduct,
  deleteProduct,
} from "@/repositories/product.repository";

const imageUrlSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().url("Please enter a valid image URL.").optional()
);

const productSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().min(10),
  imageUrl: imageUrlSchema,
  price: z.number().positive(),
  discountPercent: z.number().int().min(0).max(99).optional(),
  stock: z.number().int().nonnegative(),
  categoryId: z.string().min(1),
});

async function checkAdminAccess() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        success: false,
        message: "Please sign in first.",
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

  return null;
}

// CREATE PRODUCT
export async function POST(request: NextRequest) {
  try {
    const accessError = await checkAdminAccess();
    if (accessError) return accessError;

    const body = await request.json();
    const validation = productSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid product data",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const product = {
      id: randomUUID(),
      ...validation.data,
      createdAt: now,
      updatedAt: now,
    };

    const createdProduct = await createProduct(product);

    return NextResponse.json(
      {
        success: true,
        message: "Product created successfully",
        data: createdProduct,
      },
      { status: 201 }
    );
  } catch (error) {
  console.error("Create product error:", error);

  if (error instanceof Error) {
    if (error.message === "Category not found.") {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 404 }
      );
    }

    if (error.message === "This category is inactive.") {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 409 }
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Failed to create product",
    },
    { status: 500 }
  );
}
}

// GET PRODUCT / ALL PRODUCTS / CATEGORY PRODUCTS
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const id = params.get("id");
    const categoryId = params.get("categoryId");
    const limitParam = params.get("limit");

    const limit = limitParam ? Number(limitParam) : 20;

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Limit must be between 1 and 100",
        },
        { status: 400 }
      );
    }

    // Get single product
    if (id) {
      const product = await getProductById(id);

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            message: "Product not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: product,
      });
    }

    // Get products by category
    if (categoryId) {
      const products = await getProductsByCategory(categoryId, limit);

      return NextResponse.json({
        success: true,
        total: products.length,
        data: products,
      });
    }

    // Get all products
    const products = await getAllProducts(limit);

    return NextResponse.json({
      success: true,
      total: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve products",
      },
      { status: 500 }
    );
  }
}

// UPDATE PRODUCT
const updateSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    description: z.string().trim().min(10).optional(),
    imageUrl: imageUrlSchema,
    price: z.number().positive().optional(),
    discountPercent: z.number().int().min(0).max(99).optional(),
    stock: z.number().int().nonnegative().optional(),
    categoryId: z.string().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export async function PATCH(request: NextRequest) {
  try {
    const accessError = await checkAdminAccess();
    if (accessError) return accessError;

    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Product ID is required" },
        { status: 400 }
      );
    }

    const validation = updateSchema.safeParse(await request.json());

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid update data",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const product = await updateProduct(id, validation.data);

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  
} catch (error) {
  console.error("Update product error:", error);

  if (error instanceof Error) {
    if (error.message === "Category not found.") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 }
      );
    }

    if (error.message === "This category is inactive.") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 409 }
      );
    }

    if (error.message === "Product not found.") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 }
      );
    }

    if (
      "name" in error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return NextResponse.json(
        { success: false, message: "Product not found." },
        { status: 404 }
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Product update failed",
    },
    { status: 500 }
  );
}

}

// DELETE PRODUCT
export async function DELETE(request: NextRequest) {
  try {
    const accessError = await checkAdminAccess();
    if (accessError) return accessError;

    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Product ID is required" },
        { status: 400 }
      );
    }

    await deleteProduct(id);

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Product deletion failed or product not found",
      },
      { status: 404 }
    );
  }
}
