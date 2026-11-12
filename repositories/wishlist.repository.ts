
import { sql } from "@/lib/db";
import { getProductById } from "@/repositories/product.repository";
import type { WishlistItem } from "@/types/wishlist";

// Get all wishlist items of a user
export async function getWishlistItems(
  userId: string
): Promise<WishlistItem[]> {
  const rows = await sql`
    SELECT product_id, added_at
    FROM wishlist_items
    WHERE user_id = ${userId}
    ORDER BY added_at DESC
  `;

  return rows.map((row) => ({
    productId: String(row.product_id),
    addedAt: new Date(
      row.added_at as string
    ).toISOString(),
  }));
}

// Add product to wishlist
export async function addToWishlist(
  userId: string,
  productId: string
): Promise<WishlistItem> {
  const product = await getProductById(productId);

  if (!product) {
    throw new Error("Product not found.");
  }

  const rows = await sql`
    INSERT INTO wishlist_items (
      user_id,
      product_id,
      added_at
    )
    VALUES (
      ${userId},
      ${productId},
      NOW()
    )
    RETURNING product_id, added_at
  `;

  return {
    productId: String(rows[0].product_id),
    addedAt: new Date(
      rows[0].added_at as string
    ).toISOString(),
  };
}

// Remove product from wishlist
export async function removeFromWishlist(
  userId: string,
  productId: string
): Promise<string> {
  const rows = await sql`
    DELETE FROM wishlist_items
    WHERE user_id = ${userId}
      AND product_id = ${productId}
    RETURNING product_id
  `;

  if (!rows.length) {
    throw new Error("Wishlist item not found.");
  }

  return String(rows[0].product_id);
}
