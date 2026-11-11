
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  GetCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";

import { authOptions } from "@/lib/auth/options";
import { dynamoDB } from "@/lib/aws/dynamodb";
import { getProductById } from "@/repositories/product.repository";
import { getCartSummary } from "@/repositories/cart.repository";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

const mergeCartSchema = z.object({
  mergeId: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive().max(99),
    })
  ).max(99),
});

export async function POST(request: NextRequest) {
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

    const mergeKey = {
      PK: `USER#${userId}`,
      SK: `CART_MERGE#${mergeId}`,
    };

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

    // Prepare transaction
    const now = new Date().toISOString();

    const transactionItems = [];

    // Save merge confirmation in the same transaction
    transactionItems.push({
      Put: {
        TableName: TABLE_NAME,
        Item: {
          ...mergeKey,
          entityType: "CART_MERGE",
          mergeId,
          createdAt: now,
        },
        ConditionExpression:
          "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      },
    });

    for (const item of mergedItems) {
      const product = await getProductById(item.productId);

      if (!product) {
        return NextResponse.json(
          { success: false, message: "Product not found." },
          { status: 404 }
        );
      }

      if (product.stock <= 0) {
        return NextResponse.json(
          { success: false, message: "Product is out of stock." },
          { status: 409 }
        );
      }

      if (item.quantity > product.stock) {
        return NextResponse.json(
          {
            success: false,
            message: "Requested quantity exceeds available stock.",
          },
          { status: 409 }
        );
      }

      transactionItems.push({
        Update: {
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: `CART#PRODUCT#${item.productId}`,
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
            ":productId": item.productId,
            ":zero": 0,
            ":quantity": item.quantity,
            ":maxExisting": product.stock - item.quantity,
            ":now": now,
            ":entityType": "CART",
          },
        },
      });
    }

    try {
      await dynamoDB.send(
        new TransactWriteCommand({
          TransactItems: transactionItems,
        })
      );
    } catch (error) {
      // Check whether this merge was already completed
      const existingMerge = await dynamoDB.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: mergeKey,
          ConsistentRead: true,
        })
      );

      if (existingMerge.Item) {
        const cart = await getCartSummary(userId);

        return NextResponse.json({
          success: true,
          message: "Guest cart was already merged.",
          data: cart,
        });
      }

      if (
        error instanceof Error &&
        error.name === "TransactionCanceledException"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Cart merge failed. Please check product availability and try again.",
          },
          { status: 409 }
        );
      }

      throw error;
    }

    const cart = await getCartSummary(userId);

    return NextResponse.json({
      success: true,
      message: "Guest cart merged successfully.",
      data: cart,
    });
  } catch (error) {
    console.error("Guest cart merge error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to merge guest cart.",
      },
      { status: 500 }
    );
  }
}
