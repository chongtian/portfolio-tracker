import { TransactItems } from "@shared/clients/dynamoDb";
import { TransactionInput, TransactionType } from "@shared/models/transaction";
import {
    cashPartitionKey, cashSortKey, netWorthPartitionKey, netWorthSortKey, summaryPartitionKey, summarySortKey
} from "@shared/utils/getKeys";

export const cashTransactionHandler = (userId: string, accountId: string, tableName: string, txn: TransactionInput): TransactItems => {

    const transactItems: TransactItems = [];

    // almost all transactions except for expiration, assignment, exercise and split will have cash impact, 
    // so we can handle cash updates in one place here.
    // Collateral Cash will be handled by option handler separately
    if ([TransactionType.EXPIRATION, TransactionType.ASSIGNMENT, TransactionType.EXERCISE, TransactionType.SPLIT].includes(txn.transactionType)) {
        return transactItems;
    }

    let amount = txn.amount || (txn.quantity && txn.price ? txn.quantity * txn.price : 0) - (txn.fees || 0);
    if (txn.transactionType === TransactionType.WITHDRAW || txn.transactionType === TransactionType.BUY) {
        amount = -1 * amount;
    }
    const availBalDelta = amount - (txn.cashCollateral || 0);

    transactItems.push({
        Update: {
            TableName: tableName,
            Key: { "PK": cashPartitionKey(userId, accountId), "SK": cashSortKey() },
            UpdateExpression: "SET balance = if_not_exists(balance, :start) + :amount, \
            availableBalance = if_not_exists(availableBalance, :start) + :availBalDelta, \
            lastUpdated = :lastUpdated",
            ExpressionAttributeValues: {
                ":start": 0,
                ":amount": amount,
                ":availBalDelta": availBalDelta,
                ":lastUpdated": new Date().toISOString()
            }
        }
    });

    transactItems.push({
        Update: {
            TableName: tableName,
            Key: { "PK": summaryPartitionKey(userId, accountId), "SK": summarySortKey() },
            UpdateExpression: "SET totalCash = if_not_exists(totalCash, :start) + :amount, \
            totalAvailableCash = if_not_exists(totalAvailableCash, :start) + :availBalDelta, \
            netWorth = if_not_exists(netWorth, :start) + :amount, lastUpdated = :lastUpdated",
            ExpressionAttributeValues: {
                ":start": 0,
                ":amount": amount,
                ":availBalDelta": availBalDelta,
                ":lastUpdated": new Date().toISOString()
            }
        }
    });

    transactItems.push({
        Update: {
            TableName: tableName,
            Key: { "PK": netWorthPartitionKey(userId), "SK": netWorthSortKey() },
            UpdateExpression: "SET totalCash = if_not_exists(totalCash, :start) + :amount, \
            totalAvailableCash = if_not_exists(totalAvailableCash, :start) + :availBalDelta, \
            netWorth = if_not_exists(netWorth, :start) + :amount, lastUpdated = :lastUpdated",
            ExpressionAttributeValues: {
                ":start": 0,
                ":amount": amount,
                ":availBalDelta": availBalDelta,
                ":lastUpdated": new Date().toISOString()
            }
        }
    });

    return transactItems;
};