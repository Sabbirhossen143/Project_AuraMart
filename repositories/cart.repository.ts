
import { sql } from "@/lib/db";
import { getProductById } from "@/repositories/product.repository";
import type {
  CartItem,
  CartSummary,
} from "@/types/cart";

// Get User Cart
export async function getCartItems(
  userId: string
): Promise<CartItem[]> {
  const rows = await sql`
    SELECT
      product_id,
      quantity,
      added_at,
      updated_at
    FROM cart_items
    WHERE user_id = ${userId}
    ORDER BY added_at DESC
  `;

  return rows.map((row) => ({
    productId: String(row.product_id),
    quantity: Number(row.quantity),
    addedAt: new Date(row.added_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  }));
}

// Get Cart Summary with Product Details
export async function getCartSummary(
  userId: string
): Promise<CartSummary> {
  const cartItems = await getCartItems(userId);

  const items = await Promise.all(
    cartItems.map(async (cartItem) => {
      const product = await getProductById(cartItem.productId);

      if (!product) {
        throw new Error(
          `Product not found in cart: ${cartItem.productId}`
        );
      }

      const subtotal = product.price * cartItem.quantity;

      return {
        ...cartItem,
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          price: product.price,
          stock: product.stock,
        },
        subtotal,
      };
    })
  );

  const totalItems = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const totalPrice = items.reduce(
    (total, item) => total + item.subtotal,
    0
  );

  return {
    items,
    totalItems,
    totalPrice,
  };
}

// Add Product To Cart
export async function addToCart(
  userId: string,
  productId: string,
  quantity: number
) {
  const product = await getProductById(productId);

  if (!product) {
    throw new Error("Product not found.");
  }

  if (product.stock <= 0) {
    throw new Error("Product is out of stock.");
  }

  if (quantity < 1) {
    throw new Error("Quantity must be at least 1.");
  }

  if (quantity > product.stock) {
    throw new Error(
      "Requested quantity exceeds available stock."
    );
  }

  const rows = await sql`
    INSERT INTO cart_items (
      user_id,
      product_id,
      quantity,
      added_at,
      updated_at
    )
    VALUES (
      ${userId},
      ${productId},
      ${quantity},
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, product_id)
    DO UPDATE SET
      quantity = cart_items.quantity + EXCLUDED.quantity,
      updated_at = NOW()
    WHERE cart_items.quantity + EXCLUDED.quantity <= ${product.stock}
    RETURNING *
  `;

  if (!rows.length) {
    throw new Error(
      "Requested quantity exceeds available stock."
    );
  }

  return {
    productId: String(rows[0].product_id),
    quantity: Number(rows[0].quantity),
    addedAt: new Date(rows[0].added_at as string).toISOString(),
    updatedAt: new Date(rows[0].updated_at as string).toISOString(),
  };
}

// Update Cart Item Quantity
export async function updateCartQuantity(
  userId: string,
  productId: string,
  quantity: number
) {
  const product = await getProductById(productId);

  if (!product) {
    throw new Error("Product not found.");
  }

  if (quantity < 1) {
    throw new Error("Quantity must be at least 1.");
  }

  if (quantity > product.stock) {
    throw new Error(
      "Requested quantity exceeds available stock."
    );
  }

  const rows = await sql`
    UPDATE cart_items
    SET
      quantity = ${quantity},
      updated_at = NOW()
    WHERE user_id = ${userId}
      AND product_id = ${productId}
    RETURNING *
  `;

  if (!rows.length) {
    throw new Error("Cart item not found.");
  }

  return {
    productId: String(rows[0].product_id),
    quantity: Number(rows[0].quantity),
    addedAt: new Date(rows[0].added_at as string).toISOString(),
    updatedAt: new Date(rows[0].updated_at as string).toISOString(),
  };
}

// Remove Item From Cart
export async function removeFromCart(
  userId: string,
  productId: string
) {
  const rows = await sql`
    DELETE FROM cart_items
    WHERE user_id = ${userId}
      AND product_id = ${productId}
    RETURNING product_id
  `;

  if (!rows.length) {
    throw new Error("Cart item not found.");
  }

  return { productId: String(rows[0].product_id) };
}
