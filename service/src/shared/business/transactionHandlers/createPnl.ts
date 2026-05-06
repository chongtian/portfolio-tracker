import { TransactItems } from "@shared/clients/dynamoDb";
import { LotEntity } from "@shared/models/lot";
import { TransactionEntity } from "@shared/models/transaction";
import { EntityTypeLot, pnlPartitionKey, pnlSortKey } from "@shared/utils/getKeys";

///** * Create PnL record when closing a lot
// * @param lot the lot being closed
// * @param txn the transaction closing the lot
// * @return transactItems to create the PnL record
// */ 
export const createPnl = (lot: LotEntity, txn: TransactionEntity, tableName: string): TransactItems => {
    const transactItems: TransactItems = [];

    const pnlEntity = {
        PK: pnlPartitionKey(lot.userId, lot.accountId),
        SK: pnlSortKey(txn.txnDate, lot.instrumentId, lot.lotId),
        createdAt: new Date().toISOString(),
        entityType: EntityTypeLot,
        userId: lot.userId,
        accountId: lot.accountId,
        instrumentId: lot.instrumentId,
        closedLotSK: lot.SK,
        closedTxnSK: txn.SK,
        closedDate: txn.txnDate,
        quantityClosed: lot.openQuantity- lot.remainingQuantity,
        openPrice: lot.openPrice,
        closePrice: txn.price!,
        realizedPnl: lot.realizedPnl,
        feesAllocated: lot.feesAllocated
    };

    transactItems.push({
        Put: {
            TableName: tableName,
            Item: pnlEntity
        }
    });

    return transactItems;
}