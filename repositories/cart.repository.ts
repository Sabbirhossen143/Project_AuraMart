
import {
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

import { dynamoDB } from "@/lib/aws/dynamodb";
import { getProductById } from "@/repositories/product.repository";
import type {
  CartItem,
  CartRecord,
  CartSummary,
} from "@/types/cart";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

// Get User Cart
export async function getCartItems(
  userId: string
): Promise<CartItem[]> {
  const result = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression:
        "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "CART#",
      },
    })
  );

  return (result.Items || []).map((item) => ({
    productId:
      item.productId ||
      item.SK.replace("CART#PRODUCT#", ""),
    quantity: item.quantity,
    addedAt: item.addedAt,
    updatedAt: item.updatedAt,
  }));
}

// Get Cart Summary with Product Details
export async function getCartSummary(
  userId: string
): Promise<CartSummary> {
  const cartItems = await getCartItems(userId);

  const items = await Promise.all(
    cartItems.map(async (cartItem) => {
      const product = await getProductById(
        cartItem.productId
      );

      if (!product) {
        throw new Error(
          `Product not found in cart: ${cartItem.productId}`
        );
      }

      const subtotal =
        product.price * cartItem.quantity;

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
  // Check product existence
  const product = await getProductById(productId);

  if (!product) {
    throw new Error("Product not found.");
  }

  // Check product stock
  if (product.stock <= 0) {
    throw new Error("Product is out of stock.");
  }

  if (quantity > product.stock) {
    throw new Error("Requested quantity exceeds available stock.");
  }

  const now = new Date().toISOString();

  const result = await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,

      Key: {
        PK: `USER#${userId}`,
        SK: `CART#PRODUCT#${productId}`,
      },

      UpdateExpression: `
  SET
    productId = :productId,
    quantity = if_not_exists(quantity, :zero) + :quantity,
    addedAt = if_not_exists(addedAt, :now),
    updatedAt = :now,
    entityType = :entityType
`,
      ConditionExpression:
        "attribute_not_exists(quantity) OR quantity <= :maxExisting",

      ExpressionAttributeValues: {
  ":productId": productId,
  ":zero": 0,
  ":quantity": quantity,
  ":maxExisting": product.stock - quantity,
  ":now": now,
  ":entityType": "CART",
},

      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as CartRecord;
}


 // UPDATE CART ITEM QUANTITY
export async function updateCartQuantity(
  userId: string,
  productId: string,
  quantity: number
) {
  const product = await getProductById(productId);

  if (!product) {
    throw new Error("Product not found.");
  }

  if (quantity > product.stock) {
    throw new Error("Requested quantity exceeds available stock.");
  }

  const now = new Date().toISOString();

  const result = await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `CART#PRODUCT#${productId}`,
      },
      UpdateExpression: "SET quantity = :quantity, updatedAt = :now",
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
      ExpressionAttributeValues: {
        ":quantity": quantity,
        ":now": now,
      },
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as CartRecord;
}

// REMOVE ITEM FROM CART
export async function removeFromCart(
  userId: string,
  productId: string
) {
  await dynamoDB.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `CART#PRODUCT#${productId}`,
      },
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
    })
  );

  return { productId };
}

