import { getItemsByPKandSK, TABLE_NAME } from "@shared/clients/dynamoDb";
import { summaryPartitionKey, summarySortKey } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, internalError, internalErrorForDebug, ok } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";

export const getSummaryHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {

    try {
        const result = parseEvent(event);
        if (!result.success) return badRequest(result.error);

        const { pathParameters, queryStringParameters, userId, stage } = result.data;
        const { accountId } = pathParameters || {};

        if (!accountId) return badRequest("Missing accountId");

        const PK = summaryPartitionKey(userId, accountId);
        const SK = summarySortKey();

        const summaryItems = await getItemsByPKandSK(PK, SK, TABLE_NAME());
        return ok(summaryItems[0] ?? {});

    } catch (error) {
        console.error(error);
        if (process.env.STAGE === "dev") {
            return internalErrorForDebug(error);
        }        
        return internalError();
    }

}