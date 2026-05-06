import { queryTable, TABLE_NAME } from "@shared/clients/dynamoDb";
import { EntityTypePnL, pnlPartitionKey } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, internalError, internalErrorForDebug, ok } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";

export const listPnlsHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
    try {

        const result = parseEvent(event);
        if (!result.success) return badRequest(result.error);

        const { pathParameters, queryStringParameters, userId, stage } = result.data;

        const { startDate, endDate, pageSize, nextToken } = queryStringParameters || {};
        const { accountId } = pathParameters || {};

        const exclusiveStartKey = nextToken
            ? JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'))
            : undefined;

        const PK = pnlPartitionKey(userId, accountId || '');
        const pageSizeValue = pageSize ? parseInt(pageSize) : 20;
        const startDateValue = startDate ? `${EntityTypePnL}#${startDate.substring(0, 10)}` : 'PNL#0000-00-00';
        const endDateValue = endDate ? `${EntityTypePnL}#${endDate.substring(0, 10)}` : 'PNL#9999-99-99';

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