import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { saveAccountHandler } from '../src/functions/saveAccountHandler';
import * as parseEventModule from '@shared/utils/parseEvent';
import * as dynamoDbModule from '@shared/clients/dynamoDb';
import * as accountBootstrapModule from '@shared/business/accountBootstrap';
import { AccountType } from '@shared/models/account';
import { PutCommandOutput, TransactWriteCommandOutput } from '@aws-sdk/lib-dynamodb';

jest.mock('@shared/utils/parseEvent');
jest.mock('@shared/clients/dynamoDb');
jest.mock('@shared/business/accountBootstrap');

const mockParseEvent = parseEventModule.parseEvent as jest.MockedFunction<typeof parseEventModule.parseEvent>;
const mockPutItem = dynamoDbModule.putItem as jest.MockedFunction<typeof dynamoDbModule.putItem>;
const mockSendCommand = dynamoDbModule.sendCommand as jest.MockedFunction<typeof dynamoDbModule.sendCommand>;
const mockAccountBootstrap = accountBootstrapModule.accountBootstrap as jest.MockedFunction<typeof accountBootstrapModule.accountBootstrap>;

describe('saveAccountHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('creates a new account and returns 201', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {
          accountName: 'Test Account',
          accountType: AccountType.TAXABLE,
        },
        pathParameters: undefined,
        queryStringParameters: undefined,
        userId: 'user-1',
        stage: 'dev',
      },
    });
    mockAccountBootstrap.mockReturnValue([]);
    mockSendCommand.mockResolvedValue({} as TransactWriteCommandOutput);
    mockPutItem.mockResolvedValue({} as PutCommandOutput);

    const response = await saveAccountHandler({} as any);

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.accountName).toBe('Test Account');
    expect(body.accountType).toBe(AccountType.TAXABLE);
    expect(body.accountId).toBeDefined();
    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    expect(mockPutItem).toHaveBeenCalled();
  });

  test('updates an existing account and returns 200', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {
          accountName: 'Updated Account',
          accountType: AccountType.IRA,
        },
        pathParameters: { accountId: 'acct-1' },
        queryStringParameters: undefined,
        userId: 'user-1',
        stage: 'dev',
      },
    });
    mockPutItem.mockResolvedValue({} as PutCommandOutput);

    const response = await saveAccountHandler({} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.accountName).toBe('Updated Account');
    expect(body.accountId).toBe('acct-1');
    expect(mockPutItem).toHaveBeenCalledTimes(1);
    expect(mockSendCommand).not.toHaveBeenCalled();
  });
});
