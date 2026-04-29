import { getItemsByPKandSK } from "@shared/clients/dynamoDb";
import { netWorthPartitionKey, netWorthSortKey } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, internalError, ok } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";

export const getNetWorth = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {

    try {
        const result = parseEvent(event);
        if (!result.success) return badRequest(result.error);

        const { pathParameters, queryStringParameters, userId, stage } = result.data;

        const PK = netWorthPartitionKey(userId);
        const SK = netWorthSortKey();

        const summaryItems = await getItemsByPKandSK(PK, SK, stage);
        return ok(summaryItems[0] ?? {});

    } catch (error) {
        console.error(error);
        return internalError();
    }

}