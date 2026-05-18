import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createTransactionHandler } from '../src/functions/createTransactionHandler';
import * as parseEventModule from '@shared/utils/parseEvent';
import * as validateTransactionModule from '@shared/business/validateTransaction';
import * as processTransactionModule from '@shared/business/processTransaction';
import * as dynamoDbModule from '@shared/clients/dynamoDb';
import { AssetType, TransactionInput } from '@shared/models/transaction';
import { TransactWriteCommandOutput } from '@aws-sdk/lib-dynamodb';

jest.mock('@shared/utils/parseEvent');
jest.mock('@shared/business/validateTransaction');
jest.mock('@shared/business/processTransaction');
jest.mock('@shared/clients/dynamoDb');

const mockParseEvent = parseEventModule.parseEvent as jest.MockedFunction<typeof parseEventModule.parseEvent>;
const mockValidateTransaction = validateTransactionModule.validateTransaction as jest.MockedFunction<typeof validateTransactionModule.validateTransaction>;
const mockProcessTransaction = processTransactionModule.processTransaction as jest.MockedFunction<typeof processTransactionModule.processTransaction>;
const mockSendCommand = dynamoDbModule.sendCommand as jest.MockedFunction<typeof dynamoDbModule.sendCommand>;

describe('createTransactionHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns 201 when transaction is created', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {
          txnId: 'txn-1',
          txnDate: '2026-05-17',
          accountId: 'acct-1',
          instrumentId: 'AAPL',
          transactionType: 'BUY',
          assetType: AssetType.STOCK,
        } as TransactionInput,
        pathParameters: undefined,
        queryStringParameters: undefined,
        userId: 'user-1',
        stage: 'dev',
      },
    });
    mockValidateTransaction.mockReturnValue({ success: true });
    mockProcessTransaction.mockResolvedValue([]);
    mockSendCommand.mockResolvedValue({} as TransactWriteCommandOutput);

    const response = await createTransactionHandler({} as any);

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.txnId).toBe('txn-1');
    expect(body.accountId).toBe('acct-1');
    expect(body.transactionType).toBe('BUY');
    expect(mockSendCommand).toHaveBeenCalledTimes(1);
  });

  test('returns 400 when required fields are missing', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {
          txnId: 'txn-1',
          transactionType: 'BUY',
          assetType: AssetType.STOCK,
        } as TransactionInput,
        pathParameters: undefined,
        queryStringParameters: undefined,
        userId: 'user-1',
        stage: 'dev',
      },
    });

    const response = await createTransactionHandler({} as any);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Missing required fields');
    expect(mockSendCommand).not.toHaveBeenCalled();
  });

  test('returns 400 for duplicate transaction error', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {
          txnId: 'txn-1',
          txnDate: '2026-05-17',
          accountId: 'acct-1',
          instrumentId: 'AAPL',
          transactionType: 'BUY',
          assetType: AssetType.STOCK,
        } as TransactionInput,
        pathParameters: undefined,
        queryStringParameters: undefined,
        userId: 'user-1',
        stage: 'dev',
      },
    });
    mockValidateTransaction.mockReturnValue({ success: true });
    mockProcessTransaction.mockResolvedValue([]);
    const duplicateError = Object.assign(new Error('TransactionCanceledException'), {
      name: 'TransactionCanceledException',
      CancellationReasons: [{ Code: 'ConditionalCheckFailed' }],
    });
    mockSendCommand.mockRejectedValue(duplicateError);

    const response = await createTransactionHandler({} as any);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Duplicate transaction ignored');
  });
});
