import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-south-1",
  ...(process.env.DYNAMODB_ENDPOINT
    ? {
        endpoint: process.env.DYNAMODB_ENDPOINT,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
          secretAccessKey:
            process.env.AWS_SECRET_ACCESS_KEY || "dummy",
        },
      }
    : {}),
});

const dynamoDB = DynamoDBDocumentClient.from(client);

async function createAdmin() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!TABLE_NAME || !name || !email || !password) {
    throw new Error(
      "Missing environment variables. Check ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD and DYNAMODB_TABLE_NAME."
    );
  }

  if (password.length < 8 || password.length > 72) {
    throw new Error("Password must be 8–72 characters.");
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const hashedPassword = await bcrypt.hash(password, 12);

  await dynamoDB.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `USER#${id}`,
              SK: "PROFILE",
              entityType: "USER",
              id,
              name,
              email,
              password: hashedPassword,
              role: "ADMIN",
              isActive: true,
              createdAt: now,
              updatedAt: now,
            },
            ConditionExpression:
              "attribute_not_exists(PK) AND attribute_not_exists(SK)",
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `USER_EMAIL#${email}`,
              SK: "PROFILE",
              entityType: "USER_EMAIL",
              userId: id,
            },
            ConditionExpression:
              "attribute_not_exists(PK) AND attribute_not_exists(SK)",
          },
        },
      ],
    })
  );

  console.log("Admin account created successfully.");
  console.log("Admin Email:", email);
  console.log("Admin ID:", id);
}

createAdmin()
  .catch((error) => {
    if (error.name === "TransactionCanceledException") {
      console.error("This email may already be registered.");
    } else {
      console.error("Admin creation failed:", error.message);
    }

    process.exitCode = 1;
  })
  .finally(() => client.destroy());