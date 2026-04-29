import { queryTable, TransactItems } from "@shared/clients/dynamoDb";
import { LotEntity } from "@shared/models/lot";
import { TransactionEntity, TransactionType } from "@shared/models/transaction";
import { EntityTypeLot, lotPartitionKey } from "@shared/utils/getKeys";

export const splitTransactionHandler = async (userId: string, accountId: string, tableName: string, txn: TransactionEntity): Promise<TransactItems> => {

    const transactItems: TransactItems = [];

    if (txn.transactionType !== TransactionType.SPLIT) {
        return transactItems;
    }

    // SPLIT only changes lots
    const param = {
        TableName: tableName,
        KeyConditionExpression: "PK = :pkValue AND begins_with(SK, :entityType)",
        ExpressionAttributeValues: {
            ":pkValue": lotPartitionKey(userId, accountId, txn.instrumentId),
            ":entityType": EntityTypeLot
        },
        FilterExpression: "remainingQuantity <> 0"
    };

    const queryResult = await queryTable(param);
    const openLots = queryResult.Items as LotEntity[];
    if (!openLots || openLots.length === 0) {
        return transactItems;
    }

    const splitRatio = txn.splitRatio || 1;

    openLots.forEach(lot => {
        transactItems.push({
            Update:{
                TableName: tableName,
                Key: { "PK": lot.PK, "SK": lot.SK },
                UpdateExpression: "SET openQuantity = openQuantity * :splitRatio, \
                remainingQuantity = remainingQuantity * :splitRatio,\
                openPrice = openPrice / :splitRatio, \
                lastUpdated = :lastUpdated",
                ExpressionAttributeValues: {
                    ":splitRatio": splitRatio,
                    ":lastUpdated": new Date().toISOString()
                }
            }
        });
    });

    return transactItems;
}