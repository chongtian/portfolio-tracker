import { TransactItems } from "@shared/clients/dynamoDb";
import { cashPartitionKey, cashSortKey, summaryPartitionKey, summarySortKey, netWorthPartitionKey, netWorthSortKey } from "@shared/utils/getKeys";

export const releaseCashCollateral = (userId: string, accountId: string, tableName: string, releaseAmount: number): TransactItems => {

    const transactItems: TransactItems = [];

    transactItems.push({
        Update: {
            TableName: tableName,
            Key: { "PK": cashPartitionKey(userId, accountId), "SK": cashSortKey() },
            UpdateExpression: "SET availableBalance = if_not_exists(availableBalance, :start) + :availBalDelta, \
                        lastUpdated = :lastUpdated",
            ExpressionAttributeValues: {
                ":start": 0,
                ":availBalDelta": releaseAmount,
                ":lastUpdated": new Date().toISOString()
            }
        }
    });

    transactItems.push({
        Update: {
            TableName: tableName,
            Key: { "PK": summaryPartitionKey(userId, accountId), "SK": summarySortKey() },
            UpdateExpression: "SET totalAvailableCash = if_not_exists(totalAvailableCash, :start) + :availBalDelta, \
                        lastUpdated = :lastUpdated",
            ExpressionAttributeValues: {
                ":start": 0,
                ":availBalDelta": releaseAmount,
                ":lastUpdated": new Date().toISOString()
            }
        }
    });

    transactItems.push({
        Update: {
            TableName: tableName,
            Key: { "PK": netWorthPartitionKey(userId), "SK": netWorthSortKey() },
            UpdateExpression: "SET totalAvailableCash = if_not_exists(totalAvailableCash, :start) + :availBalDelta, \
                        lastUpdated = :lastUpdated",
            ExpressionAttributeValues: {
                ":start": 0,
                ":availBalDelta": releaseAmount,
                ":lastUpdated": new Date().toISOString()
            }
        }
    });

    return transactItems;
}