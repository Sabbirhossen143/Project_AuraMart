
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Pool } from "pg";
import { z } from "zod";

import { authOptions } from "@/lib/auth/options";
import { getCartSummary } from "@/repositories/cart.repository";

const globalForPg = globalThis as typeof globalThis & {
  auraCartMergePool?: Pool;
};

const pool =
  globalForPg.auraCartMergePool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.auraCartMergePool = pool;
}

const mergeCartSchema = z.object({
  mergeId: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive().max(99),
    })
  ).max(99),
});

class MergeError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "MergeError";
  }
}

export async function POST(request: NextRequest) {
  let client;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    const validation = mergeCartSchema.safeParse(
      await request.json()
    );

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Invalid cart data." },
        { status: 400 }
      );
    }

    const { mergeId, items } = validation.data;
    const userId = session.user.id;

    // Combine duplicate product IDs
    const mergedItems = Array.from(
      items.reduce((map, item) => {
        map.set(
          item.productId,
          (map.get(item.productId) || 0) + item.quantity
        );
        return map;
      }, new Map<string, number>())
    ).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    if (mergedItems.length > 99) {
      return NextResponse.json(
        { success: false, message: "Too many cart items." },
        { status: 400 }
      );
    }

    client = await pool.connect();

    await client.query("BEGIN");

    // Prevent duplicate cart merge
    const mergeResult = await client.query(
      `INSERT INTO cart_merges (user_id, merge_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, merge_id) DO NOTHING
       RETURNING merge_id`,
      [userId, mergeId]
    );

    // Already merged: do not add quantities again
    if (mergeResult.rowCount === 0) {
      await client.query("COMMIT");

      const cart = await getCartSummary(userId);

      return NextResponse.json({
        success: true,
        message: "Guest cart was already merged.",
        data: cart,
      });
    }

    // Process each product inside the same transaction
    for (const item of mergedItems) {
      // Lock product row to prevent concurrent stock changes
      const productResult = await client.query(
        `SELECT id, stock
         FROM products
         WHERE id = $1
         FOR UPDATE`,
        [item.productId]
      );

      if (productResult.rowCount === 0) {
        throw new MergeError("Product not found.", 404);
      }

      const stock = Number(productResult.rows[0].stock);

      if (stock <= 0) {
        throw new MergeError(
          "Product is out of stock.",
          409
        );
      }

      if (item.quantity > stock) {
        throw new MergeError(
          "Requested quantity exceeds available stock.",
          409
        );
      }

      // Insert or increase existing cart quantity
      const cartResult = await client.query(
        `INSERT INTO cart_items (
           user_id,
           product_id,
           quantity,
           added_at,
           updated_at
         )
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (user_id, product_id)
         DO UPDATE SET
           quantity = cart_items.quantity + EXCLUDED.quantity,
           updated_at = NOW()
         WHERE cart_items.quantity + EXCLUDED.quantity <= $4
         RETURNING product_id`,
        [
          userId,
          item.productId,
          item.quantity,
          stock,
        ]
      );

      if (cartResult.rowCount === 0) {
        throw new MergeError(
          "Requested quantity exceeds available stock.",
          409
        );
      }
    }

    await client.query("COMMIT");

    const cart = await getCartSummary(userId);

    return NextResponse.json({
      success: true,
      message: "Guest cart merged successfully.",
      data: cart,
    });

  } catch (error) {
    console.error("Guest cart merge error:", error);

    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Cart merge rollback error:", rollbackError);
      }
    }

    if (error instanceof MergeError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unable to merge guest cart.",
      },
      { status: 500 }
    );

  } finally {
    client?.release();
  }
}
