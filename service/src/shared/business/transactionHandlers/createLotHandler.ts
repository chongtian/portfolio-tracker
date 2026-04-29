import { TransactItems } from "@shared/clients/dynamoDb";
import { TransactionEntity, TransactionType } from "@shared/models/transaction";
import { lotPartitionKey, lotSortKey, EntityTypeLot } from "@shared/utils/getKeys";
import { ulid } from "ulid";

export const createLotHandler = async (txn: TransactionEntity, tableName: string, lotId?: string | undefined): Promise<TransactItems> => {
    const transactItems: TransactItems = [];

    if (!lotId) {
        lotId = ulid();
    }

    const qty = txn.transactionType === TransactionType.SELL ? -1 * (txn.quantity || 0) : txn.quantity || 0;

    const lotEntity = {
        PK: lotPartitionKey(txn.userId!, txn.accountId, txn.instrumentId),
        SK: lotSortKey(txn.txnDate, lotId),
        createdAt: new Date().toISOString(),
        entityType: EntityTypeLot,
        lotId: lotId,
        userId: txn.userId!,
        accountId: txn.accountId,
        instrumentId: txn.instrumentId,
        openTransactionSK: txn.SK,
        openQuantity: qty,
        cost: qty * txn.price! + (txn.fees || 0),
        remainingQuantity: qty,
        openPrice: txn.price,
        realizedPnl: 0,
        feesAllocated: txn.fees || 0
    };

    transactItems.push({
        Put: {
            TableName: tableName,
            Item: lotEntity
        }
    });

    return transactItems;
}