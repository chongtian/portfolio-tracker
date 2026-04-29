import { getItemsByPKandSK } from "@shared/clients/dynamoDb";
import { summaryPartitionKey, summarySortKey } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, internalError, ok } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";

export const getSummary = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {

    try {
        const result = parseEvent(event);
        if (!result.success) return badRequest(result.error);

        const { pathParameters, queryStringParameters, userId, stage } = result.data;
        const { accountId } = pathParameters || {};

        if (!accountId) return badRequest("Missing accountId");

        const PK = summaryPartitionKey(userId, accountId);
        const SK = summarySortKey();

        const summaryItems = await getItemsByPKandSK(PK, SK, stage);
        return ok(summaryItems[0] ?? {});

    } catch (error) {
        console.error(error);
        return internalError();
    }

}