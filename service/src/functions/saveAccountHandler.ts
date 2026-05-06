import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { accountBootstrap } from "@shared/business/accountBootstrap";
import { putItem, sendCommand, TABLE_NAME, TransactItems } from "@shared/clients/dynamoDb";
import { AccountInput, AccountType } from "@shared/models/account";
import { UserMetadata } from "@shared/models/user";
import { accountSortKey, accountPartitionKey, EntityTypeAccount, metadataPartitionKey, userSortKey } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, okCreated, internalError, ok, notFound, internalErrorForDebug } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";
import { ulid } from "ulid";

export const saveAccountHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
    try {

        const result = parseEvent(event);
        if (!result.success) return badRequest(result.error);

        const { pathParameters, body, userId, stage } = result.data;
        const { accountId } = pathParameters || {};

        const isUpdate = !!accountId;

        const accountInput = body as AccountInput;
        const { accountName, accountType } = accountInput;

        if (
            !accountName ||
            !accountType
        ) {
            return badRequest("Missing required fields");
        }

        if (!([AccountType.TAXABLE, AccountType.IRA, AccountType.E401K, AccountType.HSA, AccountType.OTHER].includes(accountType))) {
            return badRequest("Invalid account type");
        }

        if (!accountInput.baseCurrency) {
            accountInput.baseCurrency = 'USD'; //default to USD if baseCurrency is missing
        }

        const accountIdToUse = isUpdate ? accountId! : ulid();
        if (!isUpdate) {
            accountInput.active = true;           
        }

        accountInput.accountId = accountIdToUse;

        const PK = accountPartitionKey(userId);
        const SK = accountSortKey(accountIdToUse);
        const accountEntity = {
            PK,
            SK,
            createdAt: new Date().toISOString(),
            entityType: EntityTypeAccount,
            ...accountInput,
        };

        if (isUpdate) {
            await putItem(accountEntity, TABLE_NAME(), "attribute_exists(SK)");
            return ok(accountEntity);
        } else {
            const transactItems: TransactItems = [];

            transactItems.push({
                Put: {
                    TableName: TABLE_NAME(),
                    Item: accountEntity,
                    ConditionExpression: "attribute_not_exists(SK)"
                }
            });

            const downstreamUpdates = accountBootstrap(userId, accountIdToUse, TABLE_NAME());
            transactItems.push(...downstreamUpdates);

            await sendCommand(new TransactWriteCommand({ TransactItems: transactItems }));

            // save user
            const user: UserMetadata = {
                PK: metadataPartitionKey,
                SK: userSortKey,
                userId: userId,
                createdAt: (new Date()).toISOString()
            };
            await putItem(user, TABLE_NAME());

            return okCreated(accountEntity);
        }


    } catch (error) {

        console.error(error);

        if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
            return notFound("Account not found");
        }

        if (error instanceof Error && error.name === "TransactionCanceledException") {
            const reasons = (error as any).CancellationReasons;
            const isDuplicate = reasons?.[0]?.Code === "ConditionalCheckFailed";
            if (isDuplicate) return badRequest("Duplicate account");

            if (process.env.STAGE === "dev") {
                return internalErrorForDebug(reasons);
            }
        }

        return internalError();
    }
};