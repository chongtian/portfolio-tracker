import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }

  return chunks;
}

export async function batchWriteAll(tableName: string, items: any[]) {
  const chunks = chunkArray(items, 25);

  for (const chunk of chunks) {
    await writeChunkWithRetry(tableName, chunk);
  }

  console.log(`Wrote ${items.length} items.`);
}

async function writeChunkWithRetry(tableName: string, items: any[]) {
  let unprocessed = items;

  let attempt = 0;

  while (unprocessed.length > 0) {
    const requestItems = {
      [tableName]: unprocessed.map((item) => ({
        PutRequest: {
          Item: item,
        },
      })),
    };

    const result = await ddb.send(
      new BatchWriteCommand({
        RequestItems: requestItems,
      })
    );

    const remaining =
      result.UnprocessedItems?.[tableName] || [];

    unprocessed = remaining.map((r: any) => r.PutRequest.Item);

    if (unprocessed.length > 0) {
      attempt++;

      const delay = Math.min(1000 * 2 ** attempt, 10000);

      console.log(
        `Retrying ${unprocessed.length} items in ${delay}ms`
      );

      await sleep(delay);
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}