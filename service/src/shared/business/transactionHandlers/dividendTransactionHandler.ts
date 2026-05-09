import { queryTable, TransactItems } from "@shared/clients/dynamoDb";
import { LotEntity } from "@shared/models/lot";
import { TransactionEntity, TransactionType } from "@shared/models/transaction";
import { lotPartitionKey, EntityTypeLot, positionSortKey, positionPartitionKey, EntityTypePosition } from "@shared/utils/getKeys";
import { preciseRound } from "@shared/utils/mathHelper";

export const dividendTransactionHandler = async (userId: string, accountId: string, tableName: string, txn: TransactionEntity): Promise<TransactItems> => {

    const transactItems: TransactItems = [];

    if (txn.transactionType !== TransactionType.DIVIDEND) {
        return transactItems;
    }

    // get all open and Long lots 
    const param = {
        TableName: tableName,
        KeyConditionExpression: "PK = :pkValue AND begins_with(SK, :entityType)",
        FilterExpression: "remainingQuantity > :zero",
        ExpressionAttributeValues: {
            ":pkValue": lotPartitionKey(userId, accountId, txn.instrumentId),
            ":entityType": EntityTypeLot,
            ":zero": 0
        }
    };

    const queryResult = await queryTable(param);
    const openLots = queryResult.Items as LotEntity[];
    const totalRemainingQty = openLots.reduce((sum, lot) => sum + (lot.remainingQuantity || 0), 0);
    const updateLotsPlan: LotEntity[] = [];
    openLots.forEach(lot => {
        lot.realizedPnl = preciseRound((lot.realizedPnl || 0) + (lot.remainingQuantity || 0) / totalRemainingQty * (txn.amount || 0)) || 0;
        updateLotsPlan.push(lot);
    });

    // process updateLotsPlan
    updateLotsPlan.forEach(lot => {
        transactItems.push({
            Update: {
                TableName: tableName,
                Key: { "PK": lot.PK, "SK": lot.SK },
                UpdateExpression: "SET realizedPnl = :realizedPnl",
                ExpressionAttributeValues: {
                    ":realizedPnl": lot.realizedPnl
                }
            }
        });
    });

    const totalRealizedPnl = preciseRound(openLots.reduce((sum, lot) => sum + (lot.realizedPnl || 0), 0));
    transactItems.push({
        Update: {
            TableName: tableName,
            Key: {
                PK: positionPartitionKey(txn.userId!, txn.accountId),
                SK: positionSortKey(txn.instrumentId)
            },
            UpdateExpression: "SET lastUpdated = :lastUpdated, \
                entityType = :entityType, \
                userId = if_not_exists(userId, :userId), \
                accountId = if_not_exists(accountId, :accountId), \
                instrumentId = if_not_exists(instrumentId, :instrumentId), \
                realizedPnl = :realizedPnl",
            ExpressionAttributeValues: {
                ":lastUpdated": new Date().toISOString(),
                ":entityType": EntityTypePosition,
                ":userId": txn.userId,
                ":accountId": txn.accountId,
                ":instrumentId": txn.instrumentId,
                ":realizedPnl": totalRealizedPnl
            }
        }
    });

    return transactItems;
}