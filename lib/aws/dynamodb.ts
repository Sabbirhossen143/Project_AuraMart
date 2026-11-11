import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "ap-south-1";

const endpoint = process.env.DYNAMODB_ENDPOINT;

const client = new DynamoDBClient({
  region,
  ...(endpoint
    ? {
        endpoint,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
          secretAccessKey:
            process.env.AWS_SECRET_ACCESS_KEY || "dummy",
        },
      }
    : {}),
});

export const dynamoDB = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});