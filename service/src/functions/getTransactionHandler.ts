import { getItemsByPKandSK, TABLE_NAME } from "@shared/clients/dynamoDb";
import { transactionPartitionKey } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, internalError, internalErrorForDebug, notFound, ok } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";

export const getTransactionHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {

    try {
        const result = parseEvent(event);
        if (!result.success) return badRequest(result.error);

        const { pathParameters, queryStringParameters, userId, stage } = result.data;
        const { sk } = pathParameters || {};

        if (!sk) return badRequest("Missing id");

        const PK = transactionPartitionKey(userId!);
        const SK = sk;

        const items = await getItemsByPKandSK(PK, SK, TABLE_NAME());
        if (!items || items.length === 0){
            return notFound(`Cannot find transaction with key ${sk}`);
        }
        
        return ok(items[0] ?? {});

    } catch (error) {
        console.error(error);
        if (process.env.STAGE === "dev") {
            return internalErrorForDebug(error);
        }        
        return internalError();
    }

}