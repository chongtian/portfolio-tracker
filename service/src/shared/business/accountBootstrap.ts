import { TABLE_NAME, TransactItems } from "@shared/clients/dynamoDb";
import {
    cashPartitionKey, cashSortKey,
    EntityTypeCash, EntityTypeNetWorth,
    EntityTypeSummary, netWorthPartitionKey,
    netWorthSortKey, summaryPartitionKey, summarySortKey
} from "@shared/utils/getKeys";
import { totalmem } from "node:os";

export const accountBootstrap = (userId: string, accountId: string, stage: string): TransactItems => {

    const transactItems: TransactItems = [];

    const cashEntity = {
        PK: cashPartitionKey(userId, accountId),
        SK: cashSortKey(),
        createdAt: new Date().toISOString(),
        entityType: EntityTypeCash,
        balance: 0,
        availableBalance: 0,
        lastUpdated: new Date().toISOString(),
    };

    transactItems.push({
        Put: {
            TableName: TABLE_NAME(stage),
            Item: cashEntity,
            ConditionExpression: "attribute_not_exists(lastUpdated)"
        }
    });

    const summaryEntity = {
        PK: summaryPartitionKey(userId, accountId),
        SK: summarySortKey(),
        createdAt: new Date().toISOString(),
        entityType: EntityTypeSummary,
        totalCash: 0,
        totalAvailableCash: 0,
        totalPositionsValue: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        netWorth: 0,
        lastUpdated: new Date().toISOString(),
    };

    transactItems.push({
        Put: {
            TableName: TABLE_NAME(stage),
            Item: summaryEntity,
            ConditionExpression: "attribute_not_exists(lastUpdated)"
        }
    });

    const netWorthEntity = {
        PK: netWorthPartitionKey(userId),
        SK: netWorthSortKey(),
        createdAt: new Date().toISOString(),
        entityType: EntityTypeNetWorth,
        totalCash: 0,
        totalAvailableCash: 0,
        totalPositionsValue: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        netWorth: 0,
        lastUpdated: new Date().toISOString(),
    };

    transactItems.push({
        Put: {
            TableName: TABLE_NAME(stage),
            Item: netWorthEntity,
            ConditionExpression: "attribute_not_exists(lastUpdated)"
        }
    });

    return transactItems;
};