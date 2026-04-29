import { queryTable, TABLE_NAME, TransactItems } from "@shared/clients/dynamoDb";
import { LotEntity } from "@shared/models/lot";
import { TransactionEntity, TransactionType } from "@shared/models/transaction";
import { lotPartitionKey, EntityTypeLot, cashPartitionKey, cashSortKey, netWorthPartitionKey, netWorthSortKey, summaryPartitionKey, summarySortKey } from "@shared/utils/getKeys";
import { createPnlHandler } from "./createPnlHandler";
import { updatePositionHandler } from "./updatePositionHandler";
import { OptionType, parseOptionContract } from "@shared/utils/parseOptionContract";
import { releaseCashCollateral } from "./releaseCashCollateral";

export const optionTransactionHandler = async (userId: string, accountId: string, tableName: string, txn: TransactionEntity): Promise<TransactItems> => {

    const transactItems: TransactItems = [];

    if (!([TransactionType.EXPIRATION, TransactionType.ASSIGNMENT, TransactionType.EXERCISE].includes(txn.transactionType))) {
        return transactItems;
    }

    // get all open lots
    const param = {
        TableName: tableName,
        KeyConditionExpression: "PK = :pkValue AND begins_with(SK, :entityType)",
        FilterExpression: "remainingQuantity <> :zero",
        ExpressionAttributeValues: {
            ":pkValue": lotPartitionKey(userId, accountId, txn.instrumentId),
            ":entityType": EntityTypeLot,
            ":zero": 0
        }        
    };

    const queryResult = await queryTable(param);
    const openLots = queryResult.Items as LotEntity[]; 
    let releaseCollateral = 0;
    const updateLotsPlan: LotEntity[] = [];
    openLots.forEach(lot => {
        lot.realizedPnl = -1 * lot.cost;
        lot.remainingQuantity = 0;
        releaseCollateral += lot.cashCollateral || 0;
        lot.cashCollateral = 0;
        updateLotsPlan.push(lot);
    });

    // process updateLotsPlan
    updateLotsPlan.forEach(lot => {
        transactItems.push({
            Update: {
                TableName: tableName,
                Key: { "PK": lot.PK, "SK": lot.SK },
                UpdateExpression: "SET remainingQuantity = :remainingQuantity, \
                realizedPnl = :realizedPnl",
                ExpressionAttributeValues: {
                    ":remainingQuantity": lot.remainingQuantity,
                    ":realizedPnl": lot.realizedPnl
                }
            }
        });

        // create PnL record for closed quantity
        const pnlCreate = createPnlHandler(lot, txn, tableName);
        transactItems.push(...pnlCreate);
    });

    const totalRemainingQty = 0;
    const totalCost = openLots.reduce((sum, lot) => sum + lot.cost, 0) + (txn.quantity! * txn.price! + (txn.fees || 0));
    const lotEntity = {
        userId: txn.userId!,
        accountId: txn.accountId,
        instrumentId: txn.instrumentId,
        remainingQuantity: totalRemainingQty,
        cost: totalCost
    }
    const positionUpdate = await updatePositionHandler(lotEntity as LotEntity, tableName);
    transactItems.push(...positionUpdate);

    if (releaseCollateral !== 0) {
        const releaseItems = releaseCashCollateral(txn.userId!, txn.accountId, tableName, releaseCollateral);
        transactItems.push(...releaseItems);
    }

    return transactItems;
}