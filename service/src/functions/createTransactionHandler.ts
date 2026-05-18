import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, internalError, internalErrorForDebug, okCreated } from "@shared/utils/response";
import { TransactionInput } from "@shared/models/transaction";
import { sendCommand, TABLE_NAME, TransactItems } from "@shared/clients/dynamoDb";
import { EntityTypeTransaction, transactionPartitionKey, transactionSortKey } from "@shared/utils/getKeys";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { validateTransaction } from "@shared/business/validateTransaction";
import { processTransaction } from "@shared/business/processTransaction";

export const createTransactionHandler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResult> => {
    try {

        const result = parseEvent(event);
        if (!result.success) return badRequest(result.error);

        const { body, userId, stage } = result.data;

        const transactionInput = body as TransactionInput;
        const { txnId, txnDate, accountId } = transactionInput;

        const validateResult = validateTransaction(transactionInput);
        if (!validateResult.success) {
            return badRequest(validateResult.error || 'Invalid transaction input');
        }

        const PK = transactionPartitionKey(userId!);
        const SK = transactionSortKey(accountId, txnDate, txnId);

        const transactionEntity = {
            PK,
            SK,
            createdAt: new Date().toISOString(),
            entityType: EntityTypeTransaction,
            ...transactionInput,
        };

        const transactItems: TransactItems = [];
        transactItems.push({
            Put: {
                TableName: TABLE_NAME(),
                Item: transactionEntity
            }
        });

        // process downstream aggregations
        const downstreamUpdates = await processTransaction(transactionEntity, stage, userId!, accountId);
        transactItems.push(...downstreamUpdates);

        await sendCommand(new TransactWriteCommand({ TransactItems: transactItems }));
        return okCreated(transactionEntity);

    } catch (error) {

        console.error(error);

        if (error instanceof Error && error.name === "TransactionCanceledException") {
            const reasons = (error as any).CancellationReasons;
            const isDuplicate = reasons?.[0]?.Code === "ConditionalCheckFailed";

            if (isDuplicate) return badRequest("Duplicate transaction ignored");

            if (process.env.STAGE === "dev") {
                return internalErrorForDebug(reasons);
            }
        }

        if (process.env.STAGE === "dev") {
            return internalErrorForDebug(error);
        }

        return internalError();
    }
};



