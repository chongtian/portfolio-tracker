import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { listHistoryHandler } from '../src/functions/listHistoryHandler';
import * as parseEventModule from '@shared/utils/parseEvent';
import * as dynamoDbModule from '@shared/clients/dynamoDb';

jest.mock('@shared/utils/parseEvent');
jest.mock('@shared/clients/dynamoDb');

const mockParseEvent = parseEventModule.parseEvent as jest.MockedFunction<typeof parseEventModule.parseEvent>;
const mockQueryTable = dynamoDbModule.queryTable as jest.MockedFunction<typeof dynamoDbModule.queryTable>;
const mockTABLE_NAME = dynamoDbModule.TABLE_NAME as jest.MockedFunction<typeof dynamoDbModule.TABLE_NAME>;

describe('listHistoryHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockTABLE_NAME.mockReturnValue('TestTable');
  });

  test('returns history items and nextToken for a valid position history request', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {},
        pathParameters: { accountId: 'acct-1', entity: 'POS' },
        queryStringParameters: { startDate: '2025-01-01', endDate: '2025-01-31', pageSize: '5' },
        userId: 'user-1',
        stage: 'dev',
      },
    });

    mockQueryTable.mockResolvedValue({
      Items: [{ id: 'item-1' }],
      LastEvaluatedKey: { PK: 'USER#user-1#ACCOUNT#acct-1', SK: 'POS#2025-01-31' },
    } as any);

    const response = await listHistoryHandler({} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items).toEqual([{ id: 'item-1' }]);
    expect(body.hasMore).toBe(true);
    expect(body.nextToken).toBeDefined();
    expect(JSON.parse(Buffer.from(body.nextToken, 'base64').toString('utf8'))).toEqual({
      PK: 'USER#user-1#ACCOUNT#acct-1',
      SK: 'POS#2025-01-31',
    });

    expect(mockQueryTable).toHaveBeenCalledWith(expect.objectContaining({
      TableName: 'TestTable',
      KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startDate AND :endDate',
      Limit: 5,
      ExpressionAttributeValues: {
        ':pk': 'USER#user-1#ACCOUNT#acct-1',
        ':startDate': 'POS#2025-01-01',
        ':endDate': 'POS#2025-01-31',
      },
    }));
  });

  test('defaults to cash when entity is invalid', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {},
        pathParameters: { accountId: 'acct-1', entity: 'invalid' },
        queryStringParameters: {},
        userId: 'user-1',
        stage: 'dev',
      },
    });

    mockQueryTable.mockResolvedValue({ Items: [] } as any);

    const response = await listHistoryHandler({} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items).toEqual([]);
    expect(body.hasMore).toBe(false);

    expect(mockQueryTable).toHaveBeenCalledWith(expect.objectContaining({
      ExpressionAttributeValues: {
        ':pk': 'USER#user-1#ACCOUNT#acct-1',
        ':startDate': 'CASH#0000-00-00',
        ':endDate': 'CASH#9999-99-99',
      },
    }));
  });

  test('returns bad request when parseEvent fails', async () => {
    mockParseEvent.mockReturnValue({ success: false, error: 'Invalid event' });

    const response = await listHistoryHandler({} as any);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual(expect.any(Object));
  });
});
