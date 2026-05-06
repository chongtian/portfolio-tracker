import {
  DynamoDBClient,
  ScanCommand,
  BatchWriteItemCommand,
  WriteRequest,
  AttributeValue,
  ScanCommandOutput,
} from "@aws-sdk/client-dynamodb";

const REGION = process.env.AWS_REGION ?? "us-east-2";
const SOURCE_TABLE = process.env.SOURCE_TABLE ?? "portfolio_tracker_prod";
const TARGET_TABLE = process.env.TARGET_TABLE ?? "portfolio_tracker_dev"; 

const client = new DynamoDBClient({ region: REGION });

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function batchWriteWithRetry(
  tableName: string,
  items: Record<string, AttributeValue>[],
  maxRetries = 8
): Promise<number> {
  let written = 0;
  const chunks = chunkArray(items, 25); // BatchWrite max = 25

  for (const chunk of chunks) {
    let unprocessed: WriteRequest[] = chunk.map((item) => ({
      PutRequest: { Item: item },
    }));

    let attempt = 0;
    while (unprocessed.length > 0) {
      const resp = await client.send(
        new BatchWriteItemCommand({
          RequestItems: { [tableName]: unprocessed },
        })
      );

      const nextUnprocessed = resp.UnprocessedItems?.[tableName] ?? [];
      written += unprocessed.length - nextUnprocessed.length;

      if (nextUnprocessed.length === 0) break;

      attempt++;
      if (attempt > maxRetries) {
        throw new Error(
          `Exceeded retries. Remaining unprocessed: ${nextUnprocessed.length}`
        );
      }

      const waitMs = Math.min(1000 * 2 ** attempt, 10000);
      await new Promise((r) => setTimeout(r, waitMs));
      unprocessed = nextUnprocessed;
    }
  }

  return written;
}

async function copyTable(sourceTable: string, targetTable: string): Promise<void> {
  let lastEvaluatedKey: Record<string, AttributeValue> | undefined = undefined;
  let scannedPages = 0;
  let totalRead = 0;
  let totalWritten = 0;

  do {
    const scanResp: ScanCommandOutput = await client.send(
      new ScanCommand({
        TableName: sourceTable,
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    scannedPages++;
    const items = scanResp.Items ?? [];
    totalRead += items.length;

    if (items.length > 0) {
      totalWritten += await batchWriteWithRetry(targetTable, items);
    }

    lastEvaluatedKey = scanResp.LastEvaluatedKey;

    console.log(
      `[Page ${scannedPages}] Read=${items.length}, TotalRead=${totalRead}, TotalWritten=${totalWritten}`
    );
  } while (lastEvaluatedKey);

  console.log("Copy complete.");
  console.log({ sourceTable, targetTable, scannedPages, totalRead, totalWritten });
}

copyTable(SOURCE_TABLE, TARGET_TABLE).catch((err) => {
  console.error("Copy failed:", err);
  process.exit(1);
});