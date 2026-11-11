
import {
  GetCommand,
  TransactWriteCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import { dynamoDB } from "@/lib/aws/dynamodb";
import type { User, UserRecord, SafeUser } from "@/types/user";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

// Create User with Unique Email
export async function createUser(user: User) {
  const normalizedEmail = user.email.trim().toLowerCase();

  const item: UserRecord = {
    PK: `USER#${user.id}`,
    SK: "PROFILE",
    entityType: "USER",
    ...user,
    email: normalizedEmail,
  };

  const emailIndex = {
    PK: `USER_EMAIL#${normalizedEmail}`,
    SK: "PROFILE",
    entityType: "USER_EMAIL",
    userId: user.id,
  };

  await dynamoDB.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: item,
            ConditionExpression:
              "attribute_not_exists(PK) AND attribute_not_exists(SK)",
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: emailIndex,
            ConditionExpression:
              "attribute_not_exists(PK) AND attribute_not_exists(SK)",
          },
        },
      ],
    })
  );

  return item;
}

// Find User By Email
export async function getUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER_EMAIL#${normalizedEmail}`,
        SK: "PROFILE",
      },
    })
  );

  if (!result.Item) {
    return null;
  }

  return getUserById(result.Item.userId as string);
}

// Find User By ID
export async function getUserById(id: string) {
  const result = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${id}`,
        SK: "PROFILE",
      },
    })
  );

  return (result.Item as UserRecord | undefined) ?? null;
}

// Get all users for admin
export async function getAllUsers(): Promise<SafeUser[]> {
  const users: UserRecord[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await dynamoDB.send(
      new ScanCommand({
  TableName: TABLE_NAME,
  ConsistentRead: true,
  FilterExpression: "entityType = :entityType",
  ExpressionAttributeValues: {
    ":entityType": "USER",
  },
  ExclusiveStartKey: lastEvaluatedKey,
})
    );

    users.push(...((result.Items || []) as UserRecord[]));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return users
    .map(({ PK, SK, entityType, password, ...user }) => user as SafeUser)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Update user role
export async function updateUserRole(
  userId: string,
  role: "USER" | "ADMIN"
): Promise<void> {
  await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: "PROFILE",
      },
      UpdateExpression: "SET #role = :role, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#role": "role",
      },
      ExpressionAttributeValues: {
        ":role": role,
        ":updatedAt": new Date().toISOString(),
      },
      ConditionExpression: "attribute_exists(PK)",
    })
  );
}

// Activate or deactivate user
export async function updateUserStatus(
  userId: string,
  isActive: boolean
): Promise<void> {
  await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: "PROFILE",
      },
      UpdateExpression: "SET isActive = :isActive, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":isActive": isActive,
        ":updatedAt": new Date().toISOString(),
      },
      ConditionExpression: "attribute_exists(PK)",
    })
  );
}