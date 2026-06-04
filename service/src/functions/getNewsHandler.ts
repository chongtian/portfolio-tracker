import { queryTable, TABLE_NAME } from "@shared/clients/dynamoDb";
import { NewsEventEntity } from "@shared/models/newsEvent";
import { EntityTypeNewsEvent, newsEventPartitionKey, newsEventSortKey } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, internalError, internalErrorForDebug, ok } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";

export const getNewsHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {

    try {
        const result = parseEvent(event);
        if (!result.success) return badRequest(result.error);

        const { pathParameters, queryStringParameters, userId, stage } = result.data;

        // return news start from 5 days ago
        const cutoffDate = (new Date(Date.now() - 5 * 86400000)).toISOString().slice(0, 10);
        const param = {
            TableName: TABLE_NAME(),
            KeyConditionExpression: "PK = :pkValue AND SK >= :skValue",
            FilterExpression: "entityType = :entityType",
            ExpressionAttributeValues: {
                ":pkValue": newsEventPartitionKey(userId),
                ":skValue": newsEventSortKey(cutoffDate),
                ":entityType": EntityTypeNewsEvent
            }
        };

        const queryResult = await queryTable(param);
        const news = queryResult.Items as NewsEventEntity[];
        return ok(news ?? []);

    } catch (error) {
        console.error(error);
        if (process.env.STAGE === "dev") {
            return internalErrorForDebug(error);
        }
        return internalError();
    }

}