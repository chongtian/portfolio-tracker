import { queryTable, TABLE_NAME } from "@shared/clients/dynamoDb";
import { NewsEventEntity, NewsType } from "@shared/models/newsEvent";
import { EntityTypeNewsEvent, newsEventPartitionKey, newsEventSortKey } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, internalError, internalErrorForDebug, ok } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";

export const getNewsHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {

    try {
        const result = parseEvent(event);
        if (!result.success) return badRequest(result.error);

        const { pathParameters, queryStringParameters, userId, stage } = result.data;

        // return Dividend news start from 5 days ago
        const dividendCutoffDate = (new Date(Date.now() - 5 * 86400000)).toISOString().slice(0, 10);
        const queryDividendNewsParam = {
            TableName: TABLE_NAME(),
            KeyConditionExpression: "PK = :pkValue AND SK >= :skValue",
            FilterExpression: "entityType = :entityType AND newsType = :newsType",
            ExpressionAttributeValues: {
                ":pkValue": newsEventPartitionKey(userId),
                ":skValue": newsEventSortKey(dividendCutoffDate, NewsType.DIV, ""),
                ":entityType": EntityTypeNewsEvent,
                ":newsType": NewsType.DIV
            }
        };
        const queryDividendResult = await queryTable(queryDividendNewsParam);
        const dividendNews = queryDividendResult.Items as NewsEventEntity[];

        // return option news start from today
        const optionCutoffDate = new Date().toISOString().slice(0, 10);
        const queryOptionNewsParam = {
            TableName: TABLE_NAME(),
            KeyConditionExpression: "PK = :pkValue AND SK >= :skValue",
            FilterExpression: "entityType = :entityType AND newsType = :newsType",
            ExpressionAttributeValues: {
                ":pkValue": newsEventPartitionKey(userId),
                ":skValue": newsEventSortKey(optionCutoffDate, NewsType.OPTION, ""),
                ":entityType": EntityTypeNewsEvent,
                ":newsType": NewsType.OPTION
            }
        };
        const queryOptionResult = await queryTable(queryOptionNewsParam);
        const optionNews = queryOptionResult.Items as NewsEventEntity[];

        const results = [...dividendNews, ...optionNews];
        return ok(results);

    } catch (error) {
        console.error(error);
        if (process.env.STAGE === "dev") {
            return internalErrorForDebug(error);
        }
        return internalError();
    }

}