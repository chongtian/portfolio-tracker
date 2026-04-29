import { TABLE_NAME, TransactItems } from "@shared/clients/dynamoDb";
import { LotEntity } from "@shared/models/lot";
import { EntityTypePosition, positionPartitionKey, positionSortKey } from "@shared/utils/getKeys";

// lot is not an actual lot. It should contain information of summary of all open lots for the position. 
export const updatePositionHandler = async (lot: LotEntity, tableName: string): Promise<TransactItems> => {
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
                quantity = :qty, totalCost = :cost",
            ExpressionAttributeValues: {
                ":lastUpdated": new Date().toISOString(),
                ":entityType": EntityTypePosition,
                ":userId": lot.userId,
                ":accountId": lot.accountId,
                ":instrumentId": lot.instrumentId,
                ":qty": lot.remainingQuantity,
                ":cost": lot.cost
            }
        }
    });

    return transactItems;
}

