import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";

const TABLE_NAME = "AuraMart";

const client = new DynamoDBClient({
  region: "ap-south-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "dummy",
    secretAccessKey: "dummy",
  },
});

async function createTable() {
  try {
    console.log("Checking DynamoDB table...");

    try {
      await client.send(
        new DescribeTableCommand({
          TableName: TABLE_NAME,
        })
      );

      console.log("AuraMart table already exists!");
      return;
    } catch (error) {
      if (error.name !== "ResourceNotFoundException") {
        throw error;
      }
    }

    console.log("Creating AuraMart table...");

    await client.send(
      new CreateTableCommand({
        TableName: TABLE_NAME,

        AttributeDefinitions: [
          {
            AttributeName: "PK",
            AttributeType: "S",
          },
          {
            AttributeName: "SK",
            AttributeType: "S",
          },
        ],

        KeySchema: [
          {
            AttributeName: "PK",
            KeyType: "HASH",
          },
          {
            AttributeName: "SK",
            KeyType: "RANGE",
          },
        ],

        BillingMode: "PAY_PER_REQUEST",
      })
    );

    await waitUntilTableExists(
      { client, maxWaitTime: 60 },
      { TableName: TABLE_NAME }
    );

    console.log("AuraMart table created successfully!");
    console.log("Table Name:", TABLE_NAME);
    console.log("Partition Key: PK");
    console.log("Sort Key: SK");
    console.log("Table Status: ACTIVE");
  } catch (error) {
  console.error("Database setup failed!");
  console.error("Error Name:", error.name);
  console.error("Error Message:", error.message);
  console.error("Error Details:", error);
  process.exitCode = 1;
} finally {
    client.destroy();
  }
}

createTable();