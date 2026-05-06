import { TABLE_NAME, TransactItems } from "@shared/clients/dynamoDb";
import { TransactionEntity } from "@shared/models/transaction";
import { cashTransactionHandler } from "./transactionHandlers/cashTransactionHandler";
import { splitTransactionHandler } from "./transactionHandlers/splitTransactionHandler";
import { buySellTransactionHandler } from "./transactionHandlers/buySellTransactionHandler";
import { dividendTransactionHandler } from "./transactionHandlers/dividendTransactionHandler";

// This function will dispatch the transaction processing to the appropriate handlers based on transaction type and asset type. 
// It will return a list of TransactItems that need to be executed as part of the transaction processing. 
export const processTransaction = async (txn: TransactionEntity, stage: string, userId: string, accountId: string): Promise<TransactItems> => {

    const transactItems: TransactItems = [];

    const cashUpdates = cashTransactionHandler(userId!, accountId, TABLE_NAME(stage), txn);
    transactItems.push(...cashUpdates);

    const splitUpdates = await splitTransactionHandler(userId!, accountId, TABLE_NAME(stage), txn);
    transactItems.push(...splitUpdates);

    const buySellUpdates = await buySellTransactionHandler(userId!, accountId, TABLE_NAME(stage), txn);
    transactItems.push(...buySellUpdates);

    const dividendUpdates = await dividendTransactionHandler(userId!, accountId, TABLE_NAME(stage), txn);
    transactItems.push(...dividendUpdates);

    return transactItems;
}