import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

import { dynamoDB } from "@/lib/aws/dynamodb";
import type { Category, CategoryRecord } from "@/types/category";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

export async function createCategory(category: Category) {
  const item: CategoryRecord = {
    PK: "CATEGORY",
    SK: `CATEGORY#${category.id}`,
    entityType: "CATEGORY",
    ...category,
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

export async function getCategoryById(id: string) {
  const result = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: "CATEGORY",
        SK: `CATEGORY#${id}`,
      },
    })
  );

  return (result.Item as CategoryRecord | undefined) ?? null;
}

export async function getAllCategories() {
  const result = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "CATEGORY",
      },
    })
  );

  return (result.Items as CategoryRecord[] | undefined) ?? [];
}

export async function updateCategory(
  id: string,
  updates: Partial<Omit<Category, "id" | "createdAt">>
) {
  const allowedFields = [
    "name",
    "slug",
    "description",
    "image",
    "isActive",
  ] as const;

  const fields = allowedFields.filter(
    (field) => updates[field] !== undefined
  );

  if (fields.length === 0) {
    throw new Error("No valid fields provided");
  }

  const expressionNames: Record<string, string> = {};
  const expressionValues: Record<string, unknown> = {};

  const expressions = fields.map((field, index) => {
    expressionNames[`#field${index}`] = field;
    expressionValues[`:value${index}`] = updates[field];

    return `#field${index} = :value${index}`;
  });

  expressionNames["#updatedAt"] = "updatedAt";
  expressionValues[":updatedAt"] = new Date().toISOString();

  const result = await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: "CATEGORY",
        SK: `CATEGORY#${id}`,
      },
      UpdateExpression: `SET ${expressions.join(", ")}, #updatedAt = :updatedAt`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ConditionExpression: "attribute_exists(PK)",
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as CategoryRecord;
}

export async function deleteCategory(id: string) {
  await dynamoDB.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: "CATEGORY",
        SK: `CATEGORY#${id}`,
      },
      ConditionExpression: "attribute_exists(PK)",
    })
  );

  return { id };
}