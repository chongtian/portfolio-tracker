import { TransactItems } from "@shared/clients/dynamoDb";
import { LotEntity } from "@shared/models/lot";
import { EntityTypePosition, positionPartitionKey, positionSortKey } from "@shared/utils/getKeys";

///** * Update position based on lot changes. This is used for both buy and sell transactions. 
//  * @param lot Lot entity with updated remainingQuantity and cost, which can be a dummy lot
//  * @returns TransactItems to update the position
//  */ 
export const updatePosition = async (lot: LotEntity, tableName: string): Promise<TransactItems> => {
    const transactItems: TransactItems = [];

    transactItems.push({
        Update: {
            TableName: tableName,
            Key: {
                PK: positionPartitionKey(lot.userId, lot.accountId),
                SK: positionSortKey(lot.instrumentId)
            },
            UpdateExpression: "SET lastUpdated = :lastUpdated, \
                entityType = :entityType, \
                userId = if_not_exists(userId, :userId), \
                accountId = if_not_exists(accountId, :accountId), \
                instrumentId = if_not_exists(instrumentId, :instrumentId), \
                quantity = :qty, totalCost = :cost, realizedPnl= :realizedPnl",
            ExpressionAttributeValues: {
                ":lastUpdated": new Date().toISOString(),
                ":entityType": EntityTypePosition,
                ":userId": lot.userId,
                ":accountId": lot.accountId,
                ":instrumentId": lot.instrumentId,
                ":qty": lot.remainingQuantity,
                ":cost": lot.cost,
                ":realizedPnl": lot.realizedPnl || 0
            }
        }
    });

    return transactItems;
}

