import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as parseEventModule from '@shared/utils/parseEvent';
import * as dynamoDbModule from '@shared/clients/dynamoDb';
import { getSummaryHandler } from '@functions/getSummaryHandler';

jest.mock('@shared/utils/parseEvent');
jest.mock('@shared/clients/dynamoDb');

const mockParseEvent = parseEventModule.parseEvent as jest.MockedFunction<typeof parseEventModule.parseEvent>;
const mockGetItemsByPKandSK = dynamoDbModule.getItemsByPKandSK as jest.MockedFunction<typeof dynamoDbModule.getItemsByPKandSK>;

describe('getSummaryHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns 200 with summary when account is found', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {},
        pathParameters: { accountId: 'acct-01' },
        queryStringParameters: undefined,
        userId: 'user-1',
        stage: 'dev',
      },
    });
    mockGetItemsByPKandSK.mockResolvedValue([{ PK: 'PK-1', SK: 'SK-1', accountId: 'acct-01', entityType: 'SUMMARY' }]);

    const response = await getSummaryHandler({} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.accountId).toBe('acct-01');
    expect(body.entityType).toBe('SUMMARY');
  });

  test('returns 400 when accountId is missing', async () => {
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

    const response = await getSummaryHandler({} as any);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Missing accountId');
  });

});