import { TransactItems } from "@shared/clients/dynamoDb";
import {
    cashHistorySortKey, cashPartitionKey, cashSortKey, EntityTypeCash,
    EntityTypeSummary, summaryHistorySortKey, summaryPartitionKey, summarySortKey
} from "@shared/utils/getKeys";

export const accountBootstrap = (userId: string, accountId: string, tableName: string): TransactItems => {

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
            TableName: tableName,
            Item: cashEntity,
            ConditionExpression: "attribute_not_exists(PK)"
        }
    });

    const cashHistoryEntity = {
        PK: cashPartitionKey(userId, accountId),
        SK: cashHistorySortKey('0000-00-00'),
        createdAt: new Date().toISOString(),
        entityType: EntityTypeCash,
        balance: 0,
        availableBalance: 0,
        asOfDate: '0000-00-00',
        lastUpdated: new Date().toISOString(),
    };

    transactItems.push({
        Put: {
            TableName: tableName,
            Item: cashHistoryEntity
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
        lastUpdated: new Date().toISOString(),
    };

    transactItems.push({
        Put: {
            TableName: tableName,
            Item: summaryEntity,
            ConditionExpression: "attribute_not_exists(PK)"
        }
    });

    const summaryHistoryEntity = {
        PK: summaryPartitionKey(userId, accountId),
        SK: summaryHistorySortKey('0000-00-00'),
        createdAt: new Date().toISOString(),
        entityType: EntityTypeSummary,
        totalCash: 0,
        totalAvailableCash: 0,
        totalPositionsValue: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        asOfDate: '0000-00-00',
        lastUpdated: new Date().toISOString(),
    };

    transactItems.push({
        Put: {
            TableName: tableName,
            Item: summaryHistoryEntity
        }
    });

    return transactItems;
};