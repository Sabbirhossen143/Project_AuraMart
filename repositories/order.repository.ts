import {
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

import { dynamoDB } from "@/lib/aws/dynamodb";
import { getProductById } from "@/repositories/product.repository";
import { getCartItems } from "@/repositories/cart.repository";

import type {
  QueryCommandInput,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";

import type {
  Order,
  OrderRecord,
} from "@/types/order";

interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

// Create order from user's cart
export async function createOrder(
  userId: string,
  shippingAddress: ShippingAddress
): Promise<Order> {
  const cartItems = await getCartItems(userId);

  if (cartItems.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const now = new Date().toISOString();
  const orderId = crypto.randomUUID();

  const items = await Promise.all(
    cartItems.map(async (cartItem) => {
      const product = await getProductById(cartItem.productId);

      if (!product) {
        throw new Error(
          `Product not found: ${cartItem.productId}`
        );
      }

      if (product.stock < cartItem.quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}.`
        );
      }

      return {
        productId: product.id,
        productName: product.name,
        quantity: cartItem.quantity,
        price: product.price,
        subtotal: product.price * cartItem.quantity,
      };
    })
  );

  const totalItems = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const totalAmount = items.reduce(
    (total, item) => total + item.subtotal,
    0
  );

  const order: Order = {
    id: orderId,
    userId,
    items,
    totalItems,
    totalAmount,
    shippingAddress,
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    orderStatus: "PENDING",
    createdAt: now,
    updatedAt: now,
  };

  const orderRecord: OrderRecord = {
    ...order,
    PK: `USER#${userId}`,
    SK: `ORDER#${now}#${orderId}`,
    entityType: "ORDER",
    GSI1PK: "ORDER_STATUS#PENDING",
    GSI1SK: `CREATED#${now}#${orderId}`,
  };

  const transactItems = [
    {
      Put: {
        TableName: TABLE_NAME,
        Item: orderRecord,
        ConditionExpression:
          "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      },
    },

    ...items.map((item) => ({
      Update: {
        TableName: TABLE_NAME,
        Key: {
          PK: `PRODUCT#${item.productId}`,
          SK: "METADATA",
        },
        UpdateExpression:
          "SET stock = stock - :quantity, updatedAt = :now",
        ConditionExpression:
          "attribute_exists(PK) AND stock >= :quantity",
        ExpressionAttributeValues: {
          ":quantity": item.quantity,
          ":now": now,
        },
      },
    })),

    ...cartItems.map((item) => ({
      Delete: {
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `CART#PRODUCT#${item.productId}`,
        },
        ConditionExpression:
          "attribute_exists(PK) AND attribute_exists(SK)",
      },
    })),
  ];

  await dynamoDB.send(
    new TransactWriteCommand({
      TransactItems: transactItems,
    })
  );

  return order;
}

// Get order by ID
export async function getOrderById(
  userId: string,
  orderId: string
): Promise<Order | null> {
  const result = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression:
        "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": `ORDER#`,
      },
    })
  );

  const orders = (result.Items || []) as OrderRecord[];

  const order = orders.find((item) => item.id === orderId);

  if (!order) {
    return null;
  }

  const {
    PK,
    SK,
    entityType,
    GSI1PK,
    GSI1SK,
    ...orderData
  } = order;

  return orderData;
}

// Get all orders of a user
export async function getUserOrders(
  userId: string
): Promise<Order[]> {
  const result = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression:
        "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "ORDER#",
      },
      ScanIndexForward: false,
    })
  );

  const records = (result.Items || []) as OrderRecord[];

  return records.map(
    ({ PK, SK, entityType, GSI1PK, GSI1SK, ...order }) => order
  );
}

// Get all orders for admin
export async function getAllOrders(): Promise<Order[]> {
  const statuses: Order["orderStatus"][] = [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];

  const allOrders: OrderRecord[] = [];

  for (const status of statuses) {
    let lastEvaluatedKey: QueryCommandInput["ExclusiveStartKey"];

    do {
      const result = await dynamoDB.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :pk",
          ExpressionAttributeValues: {
            ":pk": `ORDER_STATUS#${status}`,
          },
          ScanIndexForward: false,
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );

      allOrders.push(
        ...((result.Items || []) as OrderRecord[])
      );

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);
  }

  return allOrders
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .map(
      ({ PK, SK, entityType, GSI1PK, GSI1SK, ...order }) =>
        order
    );
}

export async function updateOrderStatus(
  orderId: string,
  status: Order["orderStatus"]
): Promise<Order> {
  const allowedTransitions: Record<
    Order["orderStatus"],
    Order["orderStatus"][]
  > = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: [],
    CANCELLED: [],
  };

  const statuses: Order["orderStatus"][] = [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];

  let order: OrderRecord | undefined;

  // Find order by current status with pagination
  for (const currentStatus of statuses) {
    let lastEvaluatedKey: QueryCommandInput["ExclusiveStartKey"];

    do {
      const result = await dynamoDB.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :pk",
          ExpressionAttributeValues: {
            ":pk": `ORDER_STATUS#${currentStatus}`,
          },
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );

      order = (result.Items || []).find(
        (item) => item.id === orderId
      ) as OrderRecord | undefined;

      lastEvaluatedKey = result.LastEvaluatedKey;

      if (order) break;
    } while (lastEvaluatedKey);

    if (order) break;
  }

  if (!order) {
    throw new Error("Order not found.");
  }

  const currentStatus = order.orderStatus;

  // Validate status transition
  if (!allowedTransitions[currentStatus].includes(status)) {
    throw new Error(
      `Invalid order status transition: ${currentStatus} -> ${status}.`
    );
  }

  const updatedAt = new Date().toISOString();

  const transactItems: NonNullable<
  TransactWriteCommandInput["TransactItems"]
> = [
    {
      Update: {
        TableName: TABLE_NAME,
        Key: {
          PK: order.PK,
          SK: order.SK,
        },
        UpdateExpression: `
          SET
            orderStatus = :status,
            GSI1PK = :gsi1pk,
            updatedAt = :updatedAt
        `,
        ConditionExpression: "orderStatus = :currentStatus",
        ExpressionAttributeValues: {
          ":status": status,
          ":gsi1pk": `ORDER_STATUS#${status}`,
          ":updatedAt": updatedAt,
          ":currentStatus": currentStatus,
        },
      },
    },
  ];

  // Restore stock when an order is cancelled
  if (status === "CANCELLED") {
    for (const item of order.items) {
      transactItems.push({
        Update: {
          TableName: TABLE_NAME,
          Key: {
            PK: `PRODUCT#${item.productId}`,
            SK: "METADATA",
          },
          UpdateExpression:
            "SET stock = stock + :quantity, updatedAt = :updatedAt",
          ConditionExpression: "attribute_exists(PK)",
          ExpressionAttributeValues: {
            ":quantity": item.quantity,
            ":updatedAt": updatedAt,
          },
        },
      });
    }
  }

  await dynamoDB.send(
    new TransactWriteCommand({
      TransactItems: transactItems,
    })
  );

  const {
    PK,
    SK,
    entityType,
    GSI1PK,
    GSI1SK,
    ...orderData
  } = order;

  return {
    ...orderData,
    orderStatus: status,
    updatedAt,
  };
}

export async function markCodPaymentAsPaid(
  orderId: string
): Promise<Order> {
  const statuses: Order["orderStatus"][] = [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];

  let order: OrderRecord | undefined;

  // Find order using GSI1 with pagination
  for (const currentStatus of statuses) {
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const result = await dynamoDB.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :pk",
          ExpressionAttributeValues: {
            ":pk": `ORDER_STATUS#${currentStatus}`,
          },
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );

      order = (result.Items || []).find(
        (item) => item.id === orderId
      ) as OrderRecord | undefined;

      if (order) break;

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    if (order) break;
  }

  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.paymentMethod !== "COD") {
    throw new Error("Only COD orders can be accepted.");
  }

  if (order.orderStatus !== "DELIVERED") {
    throw new Error("Only delivered orders can be marked as paid.");
  }

  if (order.paymentStatus !== "PENDING") {
    throw new Error("Payment is already processed.");
  }

  const updatedAt = new Date().toISOString();

  await dynamoDB.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE_NAME,
            Key: {
              PK: order.PK,
              SK: order.SK,
            },
            UpdateExpression:
              "SET paymentStatus = :paid, updatedAt = :updatedAt",
            ConditionExpression:
              "paymentMethod = :cod AND orderStatus = :delivered AND paymentStatus = :pending",
            ExpressionAttributeValues: {
              ":paid": "PAID",
              ":pending": "PENDING",
              ":cod": "COD",
              ":delivered": "DELIVERED",
              ":updatedAt": updatedAt,
            },
          },
        },
      ],
    })
  );

  const {
    PK,
    SK,
    entityType,
    GSI1PK,
    GSI1SK,
    ...orderData
  } = order;

  return {
    ...orderData,
    paymentStatus: "PAID",
    updatedAt,
  };
}