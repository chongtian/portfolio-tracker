import { getItemsByPKandSK, TABLE_NAME } from "@shared/clients/dynamoDb";
import { accountPartitionKey, processedSortKey } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, internalError, internalErrorForDebug, ok } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";

export const getLogsHandler = async (apiEvent: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {

    try {
        const result = parseEvent(apiEvent);
        if (!result.success) return badRequest(result.error);

        const { pathParameters, queryStringParameters, userId, stage } = result.data;
        const { event } = queryStringParameters || {};

        if (!event) return badRequest("Missing query parameter 'event'");
        if (event.toString().toLowerCase() !== 'summarize_positions') return badRequest(`The query parameter event=${event} is not supported.`);

        const PK = accountPartitionKey(userId);
        const SK = processedSortKey();

        const logs = await getItemsByPKandSK(PK, SK, TABLE_NAME());
        return ok(logs ?? []);

    } catch (error) {
        console.error(error);
        if (process.env.STAGE === "dev") {
            return internalErrorForDebug(error);
        }
        return internalError();
    }

}