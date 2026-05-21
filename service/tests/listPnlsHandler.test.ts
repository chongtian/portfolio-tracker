import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { listPnlsHandler } from '../src/functions/listPnlsHandler';
import * as parseEventModule from '@shared/utils/parseEvent';
import * as dynamoDbModule from '@shared/clients/dynamoDb';

jest.mock('@shared/utils/parseEvent');
jest.mock('@shared/clients/dynamoDb');

const mockParseEvent = parseEventModule.parseEvent as jest.MockedFunction<typeof parseEventModule.parseEvent>;
const mockQueryTable = dynamoDbModule.queryTable as jest.MockedFunction<typeof dynamoDbModule.queryTable>;
const mockTABLE_NAME = dynamoDbModule.TABLE_NAME as jest.MockedFunction<typeof dynamoDbModule.TABLE_NAME>;

describe('listPnlsHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockTABLE_NAME.mockReturnValue('TestTable');
  });

  test('returns PnL items and encoded nextToken', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {},
        pathParameters: { accountId: 'acct-1' },
        queryStringParameters: { startDate: '2025-01-01', endDate: '2025-01-31', pageSize: '2' },
        userId: 'user-1',
        stage: 'dev',
      },
    });

    mockQueryTable.mockResolvedValue({
      Items: [{ pnlId: 'pnl-1' }],
      LastEvaluatedKey: { PK: 'USER#user-1#ACCOUNT#acct-1', SK: 'PNL#2025-01-31' },
    } as any);

    const response = await listPnlsHandler({} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items).toEqual([{ pnlId: 'pnl-1' }]);
    expect(body.hasMore).toBe(true);
    expect(JSON.parse(Buffer.from(body.nextToken, 'base64').toString('utf8'))).toEqual({
      PK: 'USER#user-1#ACCOUNT#acct-1',
      SK: 'PNL#2025-01-31',
    });

    expect(mockQueryTable).toHaveBeenCalledWith(expect.objectContaining({
      TableName: 'TestTable',
      KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startDate AND :endDate',
      Limit: 2,
      ExpressionAttributeValues: {
        ':pk': 'USER#user-1#ACCOUNT#acct-1',
        ':startDate': 'PNL#2025-01-01',
        ':endDate': 'PNL#2025-01-31',
      },
    }));
  });

  test('returns bad request when parseEvent fails', async () => {
    mockParseEvent.mockReturnValue({ success: false, error: 'Bad request' });

    const response = await listPnlsHandler({} as any);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual(expect.any(Object));
  });
});
