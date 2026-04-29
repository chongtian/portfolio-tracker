import { TransactWriteCommand, TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";
import { accountBootstrap } from "@shared/business/accountBootstrap";
import { putItem, sendCommand, TABLE_NAME, TransactItems } from "@shared/clients/dynamoDb";
import { AccountInput } from "@shared/models/account";
import { accountSortKey, accountPartitionKey, EntityTypeAccount } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, okCreated, internalError, ok } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";

export const createAccountHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
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

        const transactItems: TransactItems  = [];

        transactItems.push({
            Put: {
                TableName: TABLE_NAME(stage),
                Item: accountEntity,
                ConditionExpression: "attribute_not_exists(accountId)"
            }
        });

        const downstreamUpdates = accountBootstrap(userId, accountId, stage);
        downstreamUpdates.forEach(item => transactItems.push(item));

        await sendCommand(new TransactWriteCommand({ TransactItems: transactItems }));

        return okCreated(accountEntity);

    } catch (error) {
        console.error(error);

        if (error instanceof Error && error.name === "TransactionCanceledException") {
            const reasons = (error as any).CancellationReasons;
            const isDuplicate = reasons?.[0]?.Code === "ConditionalCheckFailed";

            if (isDuplicate) return badRequest("Duplicate account");
        }

        return internalError();
    }
};