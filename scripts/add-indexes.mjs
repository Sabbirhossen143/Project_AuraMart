
import {
  DynamoDBClient,
  DescribeTableCommand,
  UpdateTableCommand,
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

const indexes = [
  {
    name: "GSI1",
    attributes: [
      { AttributeName: "GSI1PK", AttributeType: "S" },
      { AttributeName: "GSI1SK", AttributeType: "S" },
    ],
    keys: [
      { AttributeName: "GSI1PK", KeyType: "HASH" },
      { AttributeName: "GSI1SK", KeyType: "RANGE" },
    ],
  },
  {
    name: "GSI2",
    attributes: [
      { AttributeName: "GSI2PK", AttributeType: "S" },
      { AttributeName: "GSI2SK", AttributeType: "S" },
    ],
    keys: [
      { AttributeName: "GSI2PK", KeyType: "HASH" },
      { AttributeName: "GSI2SK", KeyType: "RANGE" },
    ],
  },
];

async function waitForIndex(indexName) {
  while (true) {
    const result = await client.send(
      new DescribeTableCommand({
        TableName: TABLE_NAME,
      })
    );

    const index = result.Table?.GlobalSecondaryIndexes?.find(
      (item) => item.IndexName === indexName
    );

    if (index?.IndexStatus === "ACTIVE") {
      console.log(`${indexName} is ACTIVE.`);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function addIndexes() {
  try {
    for (const index of indexes) {
      const result = await client.send(
        new DescribeTableCommand({
          TableName: TABLE_NAME,
        })
      );

      const existing = result.Table?.GlobalSecondaryIndexes?.find(
        (item) => item.IndexName === index.name
      );

      if (existing?.IndexStatus === "ACTIVE") {
        console.log(`${index.name} already exists.`);
        continue;
      }

      if (existing) {
        console.log(`${index.name} is already being created.`);
        await waitForIndex(index.name);
        continue;
      }

      console.log(`Creating ${index.name}...`);

      await client.send(
        new UpdateTableCommand({
          TableName: TABLE_NAME,
          AttributeDefinitions: index.attributes,
          GlobalSecondaryIndexUpdates: [
            {
              Create: {
                IndexName: index.name,
                KeySchema: index.keys,
                Projection: {
                  ProjectionType: "ALL",
                },
              },
            },
          ],
        })
      );

      await waitForIndex(index.name);
    }

    console.log("All indexes are ready!");
  } catch (error) {
    console.error("Index creation failed:", error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
}

addIndexes();
