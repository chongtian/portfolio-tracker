import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as parseEventModule from '@shared/utils/parseEvent';
import * as dynamoDbModule from '@shared/clients/dynamoDb';
import { getLogsHandler } from '@functions/getLogsHandler';

jest.mock('@shared/utils/parseEvent');
jest.mock('@shared/clients/dynamoDb');

const mockParseEvent = parseEventModule.parseEvent as jest.MockedFunction<typeof parseEventModule.parseEvent>;
const mockGetItemsByPKandSK = dynamoDbModule.getItemsByPKandSK as jest.MockedFunction<typeof dynamoDbModule.getItemsByPKandSK>;

describe('getLogsHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns 200 with logs from specified event', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {},
        pathParameters: {},
        queryStringParameters: { event: 'summarize_positions' },
        userId: 'user-1',
        stage: 'dev',
      },
    });
    mockGetItemsByPKandSK.mockResolvedValue([{ PK: 'PK-1', SK: 'PROCESSED', event: 'summarize_positions', logs: 'logs' }]);

    const response = await getLogsHandler({} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body[0].SK).toBe('PROCESSED');
    expect(body[0].event).toBe('summarize_positions');
  });

  test('returns 400 when query parameter is missing', async () => {
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

    const response = await getLogsHandler({} as any);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Missing query parameter 'event'");
  });

  test('returns 400 when query parameter is not supported', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {},
        pathParameters: {},
        queryStringParameters: { event: 'not_supported' },
        userId: 'user-1',
        stage: 'dev',
      },
    });

    const response = await getLogsHandler({} as any);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('The query parameter event=not_supported is not supported.');
  });


});
