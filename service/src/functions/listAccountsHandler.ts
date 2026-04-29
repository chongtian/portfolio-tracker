import { getItemsByPK } from "@shared/clients/dynamoDb";
import { AccountEntity } from "@shared/models/account";
import { accountPartitionKey, EntityTypeAccount } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, internalError, ok } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";

export const listAccountsHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
    try {

        const result = parseEvent(event);
        if (!result.success) return badRequest(result.error);

        const { pathParameters, queryStringParameters, userId, stage } = result.data;
        const PK = accountPartitionKey(userId);
        const accounts = await getItemsByPK<AccountEntity>(PK, EntityTypeAccount, stage);
        return ok(accounts);

    } catch (error) {

        console.error(error);
        return internalError();
    }
};