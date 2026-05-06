import { queryTable, TABLE_NAME } from "@shared/clients/dynamoDb";
import { accountPartitionKey, EntityTypeTransaction } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, internalError, internalErrorForDebug, ok } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";

export const listTransactionsHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
    try {

        const result = parseEvent(event);
        if (!result.success) return badRequest(result.error);

        const { pathParameters, queryStringParameters, userId, stage } = result.data;

        const { startDate, endDate, pageSize, nextToken } = queryStringParameters || {};

        const exclusiveStartKey = nextToken
            ? JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'))
            : undefined;

        const PK = accountPartitionKey(userId);
        const pageSizeValue = pageSize ? parseInt(pageSize) : 20;
        const startDateValue = startDate ? `${EntityTypeTransaction}#${startDate.substring(0, 10)}` : 'TXN#0000-00-00';
        const endDateValue = endDate ? `${EntityTypeTransaction}#${endDate.substring(0, 10)}` : 'TXN#9999-99-99';

        const queryParams = {
            TableName: TABLE_NAME(),
            KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startDate AND :endDate',
            ExpressionAttributeValues: {
                ':pk': PK,
                ':startDate': startDateValue,
                ':endDate': endDateValue
            },
            Limit: pageSizeValue,
            ExclusiveStartKey: exclusiveStartKey
        }

        const queryResult = await queryTable(queryParams);

        const encodedNextToken = queryResult.LastEvaluatedKey
            ? Buffer.from(JSON.stringify(queryResult.LastEvaluatedKey)).toString('base64')
            : undefined;

        return ok({
            items: queryResult.Items || [],
            nextToken: encodedNextToken,
            hasMore: !!queryResult.LastEvaluatedKey
        });

    } catch (error) {
        console.error(error);
        if (process.env.STAGE === "dev") {
            return internalErrorForDebug(error);
        }
        return internalError();
    }
};