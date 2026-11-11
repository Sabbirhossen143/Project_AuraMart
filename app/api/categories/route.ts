import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "@/repositories/category.repository";

import {
  getProductsByCategory,
} from "@/repositories/product.repository";

const categorySchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2),
  description: z.string().trim().min(5),
  image: z.string().url(),
  isActive: z.boolean().default(true),
});

// CREATE CATEGORY
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = categorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid category data",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const category = {
      id: randomUUID(),
      ...validation.data,
      createdAt: now,
      updatedAt: now,
    };

    const createdCategory = await createCategory(category);

    return NextResponse.json(
      {
        success: true,
        message: "Category created successfully",
        data: createdCategory,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create category error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create category",
      },
      { status: 500 }
    );
  }
}

// GET ALL CATEGORIES OR SINGLE CATEGORY
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (id) {
      const category = await getCategoryById(id);

      if (!category) {
        return NextResponse.json(
          {
            success: false,
            message: "Category not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: category,
      });
    }

    const categories = await getAllCategories();

    return NextResponse.json({
      success: true,
      total: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve categories",
      },
      { status: 500 }
    );
  }
}

const updateCategorySchema = z.object({
  name: z.string().trim().min(2).optional(),
  slug: z.string().trim().min(2).optional(),
  description: z.string().trim().min(5).optional(),
  image: z.string().url().optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required" }
);

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Category ID required" },
        { status: 400 }
      );
    }

    const validation = updateCategorySchema.safeParse(
      await request.json()
    );

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const category = await updateCategory(id, validation.data);

    return NextResponse.json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Update category error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Category update failed or category not found",
      },
      { status: 404 }
    );
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Category ID is required",
        },
        { status: 400 }
      );
    }

    // Check whether the category has products
    const products = await getProductsByCategory(id, 1);

    if (products.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cannot delete category. Please move or delete its products first.",
        },
        { status: 409 }
      );
    }

    await deleteCategory(id);

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);

    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Category not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Category deletion failed",
      },
      { status: 500 }
    );
  }
}
