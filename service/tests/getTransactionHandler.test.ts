import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { getTransactionHandler } from '../src/functions/getTransactionHandler';
import * as parseEventModule from '@shared/utils/parseEvent';
import * as dynamoDbModule from '@shared/clients/dynamoDb';

jest.mock('@shared/utils/parseEvent');
jest.mock('@shared/clients/dynamoDb');

const mockParseEvent = parseEventModule.parseEvent as jest.MockedFunction<typeof parseEventModule.parseEvent>;
const mockGetItemsByPKandSK = dynamoDbModule.getItemsByPKandSK as jest.MockedFunction<typeof dynamoDbModule.getItemsByPKandSK>;

describe('getTransactionHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns 200 with transaction when found', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {},
        pathParameters: { sk: 'SK-1' },
        queryStringParameters: undefined,
        userId: 'user-1',
        stage: 'dev',
      },
    });
    mockGetItemsByPKandSK.mockResolvedValue([{ PK: 'PK-1', SK: 'SK-1', transactionType: 'BUY' }]);

    const response = await getTransactionHandler({} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.SK).toBe('SK-1');
    expect(body.transactionType).toBe('BUY');
  });

  test('returns 400 when sk is missing', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {},
        pathParameters: {},
        queryStringParameters: undefined,
        userId: 'user-1',
        stage: 'dev',
      },
    });

    const response = await getTransactionHandler({} as any);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Missing id');
  });

  test('returns 404 when transaction is not found', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {},
        pathParameters: { sk: 'SK-1' },
        queryStringParameters: undefined,
        userId: 'user-1',
        stage: 'dev',
      },
    });
    mockGetItemsByPKandSK.mockResolvedValue([]);

    const response = await getTransactionHandler({} as any);

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('Cannot find transaction');
  });
});
