
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";

import type { Order, OrderStatus } from "@/types/order";

// ============================================
// PostgreSQL Connection Pool
// ============================================

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const globalForPg = globalThis as typeof globalThis & {
  orderPgPool?: Pool;
};

const pool =
  globalForPg.orderPgPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

globalForPg.orderPgPool = pool;

// ============================================
// Database Types
// ============================================

type OrderRow = {
  id: string;
  user_id: string;
  items: Order["items"];
  total_items: number;
  total_amount: string | number;
  shipping_address: Order["shippingAddress"];
  payment_method: "COD";
  payment_status: Order["paymentStatus"];
  order_status: OrderStatus;
  created_at: Date | string;
  updated_at: Date | string;
};

type CartRow = {
  product_id: string;
  quantity: number;
};

type ProductRow = {
  id: string;
  name: string;
  price: string | number;
  stock: number;
};

// ============================================
// Helper Functions
// ============================================

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    items: row.items,
    totalItems: Number(row.total_items),
    totalAmount: Number(row.total_amount),
    shippingAddress: row.shipping_address,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function rollback(client: PoolClient) {
  try {
    await client.query("ROLLBACK");
  } catch (error) {
    console.error("Transaction rollback failed:", error);
  }
}

// ============================================
// Create Order
// ============================================

export async function createOrder(
  userId: string,
  shippingAddress: Order["shippingAddress"]
): Promise<Order> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock cart rows during checkout
    const cartResult = await client.query<CartRow>(
      `
        SELECT product_id, quantity
        FROM cart_items
        WHERE user_id = $1
        ORDER BY product_id
        FOR UPDATE
      `,
      [userId]
    );

    const cartItems = cartResult.rows;

    if (cartItems.length === 0) {
      throw new Error("Your cart is empty.");
    }

    const productIds = cartItems.map(
      (item) => item.product_id
    );

    // Lock products and get current prices and stock
    const productResult = await client.query<ProductRow>(
      `
        SELECT id, name, price, stock
        FROM products
        WHERE id = ANY($1::uuid[])
        ORDER BY id
        FOR UPDATE
      `,
      [productIds]
    );

    const productMap = new Map(
      productResult.rows.map((product) => [
        product.id,
        product,
      ])
    );

    // Validate products and stock
    const items: Order["items"] = cartItems.map(
      (cartItem) => {
        const product = productMap.get(
          cartItem.product_id
        );

        if (!product) {
          throw new Error(
            `Product not found: ${cartItem.product_id}`
          );
        }

        if (product.stock < cartItem.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}.`
          );
        }

        const priceCents = Math.round(
          Number(product.price) * 100
        );

        const subtotalCents =
          priceCents * cartItem.quantity;

        return {
          productId: product.id,
          productName: product.name,
          quantity: cartItem.quantity,
          price: priceCents / 100,
          subtotal: subtotalCents / 100,
        };
      }
    );

    const totalItems = items.reduce(
      (total, item) => total + item.quantity,
      0
    );

    const totalAmountCents = items.reduce(
      (total, item) =>
        total + Math.round(item.subtotal * 100),
      0
    );

    const totalAmount = totalAmountCents / 100;
    const orderId = randomUUID();

    // Insert order
    const orderResult = await client.query<OrderRow>(
      `
        INSERT INTO orders (
          id,
          user_id,
          items,
          total_items,
          total_amount,
          shipping_address,
          payment_method,
          payment_status,
          order_status
        )
        VALUES (
          $1,
          $2,
          $3::jsonb,
          $4,
          $5,
          $6::jsonb,
          'COD',
          'PENDING',
          'PENDING'
        )
        RETURNING *
      `,
      [
        orderId,
        userId,
        JSON.stringify(items),
        totalItems,
        totalAmount,
        JSON.stringify(shippingAddress),
      ]
    );

    // Deduct product stock
    for (const item of items) {
      const stockResult = await client.query(
        `
          UPDATE products
          SET
            stock = stock - $2,
            updated_at = NOW()
          WHERE id = $1
            AND stock >= $2
          RETURNING id
        `,
        [item.productId, item.quantity]
      );

      if (stockResult.rowCount !== 1) {
        throw new Error(
          `Insufficient stock for ${item.productName}.`
        );
      }
    }

    // Clear user's cart
    await client.query(
      `
        DELETE FROM cart_items
        WHERE user_id = $1
          AND product_id = ANY($2::uuid[])
      `,
      [userId, productIds]
    );

    await client.query("COMMIT");

    return mapOrder(orderResult.rows[0]);
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// Get Order By ID
// ============================================

export async function getOrderById(
  userId: string,
  orderId: string
): Promise<Order | null> {
  const result = await pool.query<OrderRow>(
    `
      SELECT *
      FROM orders
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [orderId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapOrder(result.rows[0]);
}

// ============================================
// Get All Orders Of A User
// ============================================

export async function getUserOrders(
  userId: string
): Promise<Order[]> {
  const result = await pool.query<OrderRow>(
    `
      SELECT *
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId]
  );

  return result.rows.map(mapOrder);
}

// ============================================
// Get All Orders For Admin
// ============================================

export async function getAllOrders(): Promise<Order[]> {
  const result = await pool.query<OrderRow>(
    `
      SELECT *
      FROM orders
      ORDER BY created_at DESC
    `
  );

  return result.rows.map(mapOrder);
}

// ============================================
// Update Order Status
// ============================================

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<Order> {
  const allowedTransitions: Record<
    OrderStatus,
    OrderStatus[]
  > = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: [],
    CANCELLED: [],
  };

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock order to prevent concurrent status updates
    const orderResult = await client.query<OrderRow>(
      `
        SELECT *
        FROM orders
        WHERE id = $1
        FOR UPDATE
      `,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new Error("Order not found.");
    }

    const order = mapOrder(orderResult.rows[0]);
    const currentStatus = order.orderStatus;

    if (!allowedTransitions[currentStatus].includes(status)) {
      throw new Error(
        `Invalid order status transition: ${currentStatus} -> ${status}.`
      );
    }

    // Restore stock when an order is cancelled
    if (status === "CANCELLED") {
      const productIds = order.items.map(
        (item) => item.productId
      );

      const productResult = await client.query<{
        id: string;
      }>(
        `
          SELECT id
          FROM products
          WHERE id = ANY($1::uuid[])
          ORDER BY id
          FOR UPDATE
        `,
        [productIds]
      );

      const existingProducts = new Set(
        productResult.rows.map((product) => product.id)
      );

      for (const item of order.items) {
        if (!existingProducts.has(item.productId)) {
          throw new Error(
            `Product not found: ${item.productId}`
          );
        }
      }

      for (const item of order.items) {
        await client.query(
          `
            UPDATE products
            SET
              stock = stock + $2,
              updated_at = NOW()
            WHERE id = $1
          `,
          [item.productId, item.quantity]
        );
      }
    }

    // Update order status
    const updateResult = await client.query<OrderRow>(
      `
        UPDATE orders
        SET
          order_status = $2,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [orderId, status]
    );

    await client.query("COMMIT");

    return mapOrder(updateResult.rows[0]);
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// Mark COD Payment As Paid
// ============================================

export async function markCodPaymentAsPaid(
  orderId: string
): Promise<Order> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock order to prevent duplicate payment updates
    const orderResult = await client.query<OrderRow>(
      `
        SELECT *
        FROM orders
        WHERE id = $1
        FOR UPDATE
      `,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new Error("Order not found.");
    }

    const order = mapOrder(orderResult.rows[0]);

    if (order.paymentMethod !== "COD") {
      throw new Error("Only COD orders can be accepted.");
    }

    if (order.orderStatus !== "DELIVERED") {
      throw new Error(
        "Only delivered orders can be marked as paid."
      );
    }

    if (order.paymentStatus !== "PENDING") {
      throw new Error("Payment is already processed.");
    }

    const updateResult = await client.query<OrderRow>(
      `
        UPDATE orders
        SET
          payment_status = 'PAID',
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [orderId]
    );

    await client.query("COMMIT");

    return mapOrder(updateResult.rows[0]);
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }
}
