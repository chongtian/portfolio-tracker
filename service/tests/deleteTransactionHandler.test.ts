import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { deleteTransactionHandler } from '../src/functions/deleteTransactionHandler';
import * as parseEventModule from '@shared/utils/parseEvent';
import * as dynamoDbModule from '@shared/clients/dynamoDb';
import * as processTransactionModule from '@shared/business/processTransaction';
import { TransactWriteCommandOutput } from '@aws-sdk/lib-dynamodb';

jest.mock('@shared/utils/parseEvent');
jest.mock('@shared/clients/dynamoDb');
jest.mock('@shared/business/processTransaction');

const mockParseEvent = parseEventModule.parseEvent as jest.MockedFunction<typeof parseEventModule.parseEvent>;
const mockGetItemsByPKandSK = dynamoDbModule.getItemsByPKandSK as jest.MockedFunction<typeof dynamoDbModule.getItemsByPKandSK>;
const mockSendCommand = dynamoDbModule.sendCommand as jest.MockedFunction<typeof dynamoDbModule.sendCommand>;
const mockProcessTransaction = processTransactionModule.processTransaction as jest.MockedFunction<typeof processTransactionModule.processTransaction>;

describe('deleteTransactionHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns 204 when transaction is deleted', async () => {
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
    mockGetItemsByPKandSK.mockResolvedValue([{ PK: 'PK-1', SK: 'SK-1', accountId: 'acct-1', quantity: 1, amount: 100, fees: 0, cashCollateral: 0 }]);
    mockProcessTransaction.mockResolvedValue([]);
    mockSendCommand.mockResolvedValue({} as TransactWriteCommandOutput);

    const response = await deleteTransactionHandler({} as any);

    expect(response.statusCode).toBe(204);
    expect(mockSendCommand).toHaveBeenCalledTimes(1);
  });

  test('returns 404 when transaction cannot be found', async () => {
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

    const response = await deleteTransactionHandler({} as any);

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Transaction not found');
    expect(mockSendCommand).not.toHaveBeenCalled();
  });
});
