import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

import { dynamoDB } from "@/lib/aws/dynamodb";
import { getProductById } from "@/repositories/product.repository";

import type { WishlistItem } from "@/types/wishlist";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

// Get all wishlist items of a user
export async function getWishlistItems(
  userId: string
): Promise<WishlistItem[]> {
  const result = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression:
        "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "WISHLIST#PRODUCT#",
      },
    })
  );

  return (result.Items || []) as WishlistItem[];
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

  const now = new Date().toISOString();

  const item = {
    PK: `USER#${userId}`,
    SK: `WISHLIST#PRODUCT#${productId}`,
    entityType: "WISHLIST" as const,
    productId,
    addedAt: now,
  };

  await dynamoDB.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression:
        "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    })
  );

  return {
    productId: item.productId,
    addedAt: item.addedAt,
  };
}

// Remove product from wishlist
export async function removeFromWishlist(
  userId: string,
  productId: string
): Promise<string> {
  await dynamoDB.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `WISHLIST#PRODUCT#${productId}`,
      },
      ConditionExpression:
        "attribute_exists(PK) AND attribute_exists(SK)",
    })
  );

  return productId;
}