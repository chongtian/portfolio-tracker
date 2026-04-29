import { putItem } from "@shared/clients/dynamoDb";
import { AccountInput } from "@shared/models/account";
import { accountSortKey, accountPartitionKey, EntityTypeAccount } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, okCreated, internalError, ok, notFound } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";

export const saveAccountHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
    try {

        const result = parseEvent(event);
        if (!result.success) return badRequest(result.error);

        const { body, userId, stage } = result.data;

        const accountInput = body as AccountInput;
        const { accountId, accountName, accountType } = accountInput;

        if (
            !accountId ||
            !accountName ||
            !accountType
        ) {
            return badRequest("Missing required fields");
        }

        if (!accountInput.baseCurrency) {
            accountInput.baseCurrency = 'USD'; //default to USD if baseCurrency is missing
        }

        const PK = accountPartitionKey(userId);
        const SK = accountSortKey(accountId);

        const accountEntity = {
            PK,
            SK,
            createdAt: new Date().toISOString(),
            entityType: EntityTypeAccount,
            ...accountInput,
        };

        await putItem(accountEntity, "attribute_exists(SK)", stage);
        return okCreated(accountEntity);

    } catch (error) {
        if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
            return notFound("Account not found");
        }

        console.error(error);
        return internalError();
    }
};