import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as parseEventModule from '@shared/utils/parseEvent';
import * as dynamoDbModule from '@shared/clients/dynamoDb';
import { getNewsHandler } from '@functions/getNewsHandler';

jest.mock('@shared/utils/parseEvent');
jest.mock('@shared/clients/dynamoDb');

const mockParseEvent = parseEventModule.parseEvent as jest.MockedFunction<typeof parseEventModule.parseEvent>;
const mockQueryTable = dynamoDbModule.queryTable as jest.MockedFunction<typeof dynamoDbModule.queryTable>;

describe('getNewsHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns 200 with news', async () => {
    mockParseEvent.mockReturnValue({
      success: true,
      data: {
        body: {},
        pathParameters: {},
        queryStringParameters: {},
        userId: 'user-1',
        stage: 'dev',
      },
    });
    mockQueryTable.mockResolvedValue({
      Items: [{ PK: 'USER#user-1', SK: 'NEWS#2027-01-31', entityType: 'NEWS', newsType: 'DIV', }],
      LastEvaluatedKey: { PK: 'USER#user-1', SK: 'NEWS#2027-01-31' },
    } as any);

    const response = await getNewsHandler({} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body[0].SK).toBe('NEWS#2027-01-31');
    expect(body[0].newsType).toBe('DIV');
  });

});
