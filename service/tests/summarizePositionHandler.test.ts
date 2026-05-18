import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { summarizePositionHandler } from '../src/functions/summarizePositionHandler';
import * as parseEventModule from '@shared/utils/parseEvent';
import * as dynamoDbModule from '@shared/clients/dynamoDb';
import * as summarizePositionsModule from '@shared/business/summarizePositions';
import { APIGatewayProxyResult } from 'aws-lambda';

jest.mock('@shared/utils/parseEvent');
jest.mock('@shared/clients/dynamoDb');
jest.mock('@shared/business/summarizePositions');

const mockParseEvent = parseEventModule.parseEvent as jest.MockedFunction<typeof parseEventModule.parseEvent>;
const mockGetItemsByPKandSK = dynamoDbModule.getItemsByPKandSK as jest.MockedFunction<typeof dynamoDbModule.getItemsByPKandSK>;
const mockTABLE_NAME = dynamoDbModule.TABLE_NAME as jest.MockedFunction<typeof dynamoDbModule.TABLE_NAME>;
const mockSummarizePositions = summarizePositionsModule.summarizePositions as jest.MockedFunction<typeof summarizePositionsModule.summarizePositions>;

describe('summarizePositionHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockTABLE_NAME.mockReturnValue('TestTable');
  });

  test('handles API Gateway event and returns summarized positions', async () => {
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

    mockSummarizePositions.mockResolvedValue({ result: 'ok' } as any);

    const response = await summarizePositionHandler({ requestContext: { http: {} } } as any);
  
    expect((response as APIGatewayProxyResult).statusCode).toBe(200);
    expect(JSON.parse((response as APIGatewayProxyResult).body)).toEqual({ result: 'ok' });
    expect(mockSummarizePositions).toHaveBeenCalledWith('user-1', 'TestTable', 'API Gateway');
  });

  test('handles EventBridge summarize_positions action', async () => {
    mockGetItemsByPKandSK.mockResolvedValue([{ userId: 'user-1' }] as any);
    mockSummarizePositions.mockResolvedValue({ result: 'ok' } as any);

    const response = await summarizePositionHandler({ action: 'summarize_positions' });

    expect(response).toEqual({ ok: true, message: 'Successfully summarized all Positions' });
    expect(mockSummarizePositions).toHaveBeenCalledTimes(1);
    expect(mockSummarizePositions).toHaveBeenCalledWith('user-1', 'TestTable', 'EventBridge');
  });

  test('throws when event source is unsupported', async () => {
    await expect(summarizePositionHandler({ foo: 'bar' } as any)).rejects.toThrow('Unsupported event source');
  });
});
