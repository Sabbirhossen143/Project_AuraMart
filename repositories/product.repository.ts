
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

import { dynamoDB } from "@/lib/aws/dynamodb";
import type { Product, ProductRecord } from "@/types/product";
import { getCategoryById } from "@/repositories/category.repository";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

async function validateCategory(categoryId: string) {
  const category = await getCategoryById(categoryId);

  if (!category) {
    throw new Error("Category not found.");
  }

  if (!category.isActive) {
    throw new Error("This category is inactive.");
  }

  return category;
}

// Create Product
export async function createProduct(product: Product) {
  await validateCategory(product.categoryId);

  const item: ProductRecord = {
    PK: `PRODUCT#${product.id}`,
    SK: "METADATA",
    entityType: "PRODUCT",

    GSI1PK: "PRODUCT",
    GSI1SK: `CREATED#${product.createdAt}#${product.id}`,

    GSI2PK: `CATEGORY#${product.categoryId}`,
    GSI2SK: `CREATED#${product.createdAt}#${product.id}`,

    ...product,
  };

  await dynamoDB.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression:
        "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    })
  );

  return item;
}

// Get Product By ID
export async function getProductById(id: string) {
  const result = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PRODUCT#${id}`,
        SK: "METADATA",
      },
    })
  );

  return (result.Item as ProductRecord | undefined) ?? null;
}

// Get All Products
export async function getAllProducts(limit = 20) {
  const result = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "PRODUCT",
      },
      Limit: limit,
      ScanIndexForward: false,
    })
  );

  return (result.Items as ProductRecord[] | undefined) ?? [];
}

// Get Products By Category
export async function getProductsByCategory(
  categoryId: string,
  limit = 20
) {
  const result = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `CATEGORY#${categoryId}`,
      },
      Limit: limit,
      ScanIndexForward: false,
    })
  );

  return (result.Items as ProductRecord[] | undefined) ?? [];
}

// Update Product
export async function updateProduct(
  id: string,
  updates: Partial<
  Pick<
    Product,
    "name" | "description" | "imageUrl" | "price" | "stock" | "categoryId" | "discountPercent"
  >
>
) {
  const allowedFields = [
  "name",
  "description",
  "imageUrl",
  "price",
  "discountPercent",
  "stock",
  "categoryId",
] as const;

  const updateEntries = Object.entries(updates).filter(
    ([key, value]) =>
      allowedFields.includes(key as (typeof allowedFields)[number]) &&
      value !== undefined
  );

  if (updateEntries.length === 0) {
    throw new Error("No valid fields provided for update.");
  }

  const expressionNames: Record<string, string> = {};
  const expressionValues: Record<string, unknown> = {};
  const updateExpressions: string[] = [];

  updateEntries.forEach(([key, value], index) => {
    const nameKey = `#field${index}`;
    const valueKey = `:value${index}`;

    expressionNames[nameKey] = key;
    expressionValues[valueKey] = value;

    updateExpressions.push(`${nameKey} = ${valueKey}`);
  });

  expressionNames["#updatedAt"] = "updatedAt";
  expressionValues[":updatedAt"] = new Date().toISOString();

  updateExpressions.push("#updatedAt = :updatedAt");

  // Update category index keys if category changes
  const categoryUpdate = updateEntries.find(
    ([key]) => key === "categoryId"
  );

  if (categoryUpdate) {
    const categoryId = String(categoryUpdate[1]);

    await validateCategory(categoryId);

    expressionNames["#gsi2pk"] = "GSI2PK";
    expressionNames["#gsi2sk"] = "GSI2SK";

    expressionValues[":gsi2pk"] = `CATEGORY#${categoryId}`;

    // Preserve creation-time ordering
    const existing = await getProductById(id);

    if (!existing) {
      throw new Error("Product not found.");
    }

    expressionValues[":gsi2sk"] =
      `CREATED#${existing.createdAt}#${id}`;

    updateExpressions.push(
      "#gsi2pk = :gsi2pk",
      "#gsi2sk = :gsi2sk"
    );
  }

  const result = await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PRODUCT#${id}`,
        SK: "METADATA",
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ConditionExpression: "attribute_exists(PK)",
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as ProductRecord;
}

// Delete Product
export async function deleteProduct(id: string) {
  await dynamoDB.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PRODUCT#${id}`,
        SK: "METADATA",
      },
      ConditionExpression: "attribute_exists(PK)",
    })
  );

  return { id };
}
