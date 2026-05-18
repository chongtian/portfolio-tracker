import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { listAccountsHandler } from '../src/functions/listAccountsHandler';
import * as parseEventModule from '@shared/utils/parseEvent';
import * as dynamoDbModule from '@shared/clients/dynamoDb';

jest.mock('@shared/utils/parseEvent');
jest.mock('@shared/clients/dynamoDb');

const mockParseEvent = parseEventModule.parseEvent as jest.MockedFunction<typeof parseEventModule.parseEvent>;
const mockGetItemsByPK = dynamoDbModule.getItemsByPK as jest.MockedFunction<typeof dynamoDbModule.getItemsByPK>;
const mockGetItemsByPKandSK = dynamoDbModule.getItemsByPKandSK as jest.MockedFunction<typeof dynamoDbModule.getItemsByPKandSK>;
const mockQueryTable = dynamoDbModule.queryTable as jest.MockedFunction<typeof dynamoDbModule.queryTable>;

describe('listAccountsHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns account list when no summary or position requested', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {},
        pathParameters: undefined,
        queryStringParameters: undefined,
        userId: 'user-1',
        stage: 'dev',
      },
    });
    mockGetItemsByPK.mockResolvedValue([{ accountId: 'acct-1', accountName: 'Test Account' }]);

    const response = await listAccountsHandler({} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].accountId).toBe('acct-1');
  });

  test('returns account details with summary and positions when requested', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {},
        pathParameters: undefined,
        queryStringParameters: { summary: 'true', position: 'true' },
        userId: 'user-1',
        stage: 'dev',
      },
    });
    mockGetItemsByPK.mockResolvedValue([{ accountId: 'acct-1', accountName: 'Test Account' }]);
    mockGetItemsByPKandSK.mockResolvedValue([{ summaryId: 'summary-1', total: 100 }]);
    mockQueryTable.mockResolvedValue({ Items: [{ positionId: 'position-1', quantity: 10 }], Count: 1, ScannedCount: 1 } as any);

    const response = await listAccountsHandler({} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].summary).toBeDefined();
    expect(body[0].positions).toEqual([{ positionId: 'position-1', quantity: 10 }]);
  });
});
