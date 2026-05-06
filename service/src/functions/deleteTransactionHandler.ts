import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, internalError, internalErrorForDebug, notFound, okDeleted } from "@shared/utils/response";
import { TransactionEntity } from "@shared/models/transaction";
import { getItemsByPKandSK, sendCommand, TABLE_NAME, TransactItems } from "@shared/clients/dynamoDb";
import { transactionPartitionKey } from "@shared/utils/getKeys";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { processTransaction } from "@shared/business/processTransaction";

export const deleteTransactionHandler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResult> => {
    try {

        const result = parseEvent(event);
        if (!result.success) return badRequest(result.error);

        const { pathParameters, queryStringParameters, userId, stage } = result.data;
        const { sk } = pathParameters || {};

        if (!sk) return badRequest("Missing id");

        const PK = transactionPartitionKey(userId!);
        const SK = sk;

        const deleteKey = {
            PK,
            SK,
        };

        const queryResult = await getItemsByPKandSK<TransactionEntity>(PK, SK, TABLE_NAME());
        const transactionToDelete = queryResult[0] ?? null;

        if (!transactionToDelete) {
            return notFound("Transaction not found");
        }

        const accountId = transactionToDelete.accountId;

        const transactItems: TransactItems = [];

        transactItems.push({
            Delete: {
                TableName: TABLE_NAME(),
                Key: deleteKey,
                ConditionExpression: 'attribute_exists(PK)'
            }
        });

        // process downstream aggregations
        transactionToDelete.quantity = -1 * transactionToDelete.quantity!;
        transactionToDelete.amount = -1 * (transactionToDelete.amount || 0);
        transactionToDelete.fees = -1 * (transactionToDelete.fees || 0);
        transactionToDelete.cashCollateral = -1 * (transactionToDelete.cashCollateral || 0);
        const downstreamUpdates = await processTransaction(transactionToDelete, stage, userId!, accountId);
        transactItems.push(...downstreamUpdates);

        await sendCommand(new TransactWriteCommand({ TransactItems: transactItems }));
        return okDeleted();

    } catch (error) {
        if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
            return notFound("Transaction not found");
        }

        if (error instanceof Error && error.name === "TransactionCanceledException") {
            const reasons = (error as any).CancellationReasons;
            if (process.env.STAGE === "dev") {
                return internalErrorForDebug(reasons);
            }
        }

        if (process.env.STAGE === "dev") {
            return internalErrorForDebug(error);
        }

        console.error(error);
        return internalError();
    }
};



