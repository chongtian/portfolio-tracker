import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { listPositionsHandler } from '../src/functions/listPositionsHandler';
import * as parseEventModule from '@shared/utils/parseEvent';
import * as dynamoDbModule from '@shared/clients/dynamoDb';

jest.mock('@shared/utils/parseEvent');
jest.mock('@shared/clients/dynamoDb');

const mockParseEvent = parseEventModule.parseEvent as jest.MockedFunction<typeof parseEventModule.parseEvent>;
const mockQueryTable = dynamoDbModule.queryTable as jest.MockedFunction<typeof dynamoDbModule.queryTable>;
const mockTABLE_NAME = dynamoDbModule.TABLE_NAME as jest.MockedFunction<typeof dynamoDbModule.TABLE_NAME>;

describe('listPositionsHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockTABLE_NAME.mockReturnValue('TestTable');
  });

  test('returns position items with filter and nextToken', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {},
        pathParameters: { accountId: 'acct-1' },
        queryStringParameters: { pageSize: '3' },
        userId: 'user-1',
        stage: 'dev',
      },
    });

    mockQueryTable.mockResolvedValue({
      Items: [{ positionId: 'pos-1', quantity: 5 }],
      LastEvaluatedKey: { PK: 'USER#user-1#ACCOUNT#acct-1', SK: 'POS#instrument-1' },
    } as any);

    const response = await listPositionsHandler({} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items).toEqual([{ positionId: 'pos-1', quantity: 5 }]);
    expect(body.hasMore).toBe(true);
    expect(JSON.parse(Buffer.from(body.nextToken, 'base64').toString('utf8'))).toEqual({
      PK: 'USER#user-1#ACCOUNT#acct-1',
      SK: 'POS#instrument-1',
    });

    expect(mockQueryTable).toHaveBeenCalledWith(expect.objectContaining({
      TableName: 'TestTable',
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :entityType)',
      FilterExpression: 'quantity <> :zero',
      Limit: 3,
      ExpressionAttributeValues: {
        ':pk': 'USER#user-1#ACCOUNT#acct-1',
        ':entityType': 'POS',
        ':zero': 0,
      },
    }));
  });

  test('returns bad request when parseEvent fails', async () => {
    mockParseEvent.mockReturnValue({ success: false, error: 'Invalid event' });

    const response = await listPositionsHandler({} as any);

    expect(response.statusCode).toBe(400);
  });
});
