import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { listTransactionsHandler } from '../src/functions/listTransactionsHandler';
import * as parseEventModule from '@shared/utils/parseEvent';
import * as dynamoDbModule from '@shared/clients/dynamoDb';

jest.mock('@shared/utils/parseEvent');
jest.mock('@shared/clients/dynamoDb');

const mockParseEvent = parseEventModule.parseEvent as jest.MockedFunction<typeof parseEventModule.parseEvent>;
const mockQueryTable = dynamoDbModule.queryTable as jest.MockedFunction<typeof dynamoDbModule.queryTable>;
const mockTABLE_NAME = dynamoDbModule.TABLE_NAME as jest.MockedFunction<typeof dynamoDbModule.TABLE_NAME>;

describe('listTransactionsHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockTABLE_NAME.mockReturnValue('TestTable');
  });

  test('returns transaction items and uses reverse scan ordering', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {},
        pathParameters: {},
        queryStringParameters: { startDate: '2025-06-01', endDate: '2025-06-30', pageSize: '4' },
        userId: 'user-1',
        stage: 'dev',
      },
    });

    mockQueryTable.mockResolvedValue({
      Items: [{ txnId: 'txn-1' }],
      LastEvaluatedKey: { PK: 'USER#user-1', SK: 'TXN#2025-06-30' },
    } as any);

    const response = await listTransactionsHandler({} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items).toEqual([{ txnId: 'txn-1' }]);
    expect(body.hasMore).toBe(true);
    expect(JSON.parse(Buffer.from(body.nextToken, 'base64').toString('utf8'))).toEqual({
      PK: 'USER#user-1',
      SK: 'TXN#2025-06-30',
    });

    expect(mockQueryTable).toHaveBeenCalledWith(expect.objectContaining({
      TableName: 'TestTable',
      KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startDate AND :endDate',
      ScanIndexForward: false,
      Limit: 4,
      ExpressionAttributeValues: {
        ':pk': 'USER#user-1',
        ':startDate': 'TXN#2025-06-01',
        ':endDate': 'TXN#2025-06-30',
      },
    }));
  });

  test('returns bad request when parseEvent fails', async () => {
    mockParseEvent.mockReturnValue({ success: false, error: 'Bad event' });

    const response = await listTransactionsHandler({} as any);

    expect(response.statusCode).toBe(400);
  });
});
