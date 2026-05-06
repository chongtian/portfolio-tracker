import { queryTable, TransactItems } from "@shared/clients/dynamoDb";
import { LotEntity } from "@shared/models/lot";
import { TransactionEntity, TransactionType } from "@shared/models/transaction";
import { EntityTypeLot, lotPartitionKey } from "@shared/utils/getKeys";
import { createLot } from "./createLot";
import { updatePosition } from "./updatePosition";
import { createPnl } from "./createPnl";
import { releaseCashCollateral } from "./releaseCashCollateral";
import { getMultipler } from "@shared/utils/getMultipler";

export const buySellTransactionHandler = async (userId: string, accountId: string, tableName: string, txn: TransactionEntity): Promise<TransactItems> => {

    const transactItems: TransactItems = [];

    if (txn.transactionType !== TransactionType.BUY && txn.transactionType !== TransactionType.SELL) {
        return transactItems;
    }

    const isBuy = txn.transactionType === TransactionType.BUY;

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

    if (!openLots || openLots.length === 0) {
        // create lot, position
        const lotCreate = await createLot(txn, tableName);
        transactItems.push(...lotCreate);

        const qty = txn.transactionType === TransactionType.SELL ? -1 * (txn.quantity || 0) : txn.quantity || 0;
        const lotEntity = {
            userId: txn.userId!,
            accountId: txn.accountId,
            instrumentId: txn.instrumentId,
            remainingQuantity: qty,
            cost: qty * txn.price! * getMultipler(txn.instrumentId) + (txn.fees || 0),
            cashCollateral: txn.cashCollateral
        }
        const positionUpdate = await updatePosition(lotEntity as LotEntity, tableName);
        transactItems.push(...positionUpdate);

        return transactItems;
    }

    let txnQty = txn.quantity || 0;
    let txnFee = txn.fees || 0;
    let releaseCollateral = 0;
    const updateLotsPlan: LotEntity[] = [];

    openLots.forEach(lot => {
        if (txnQty === 0) {
            // No transaction quantity to process, skip
            return;
        }

        if ((isBuy && lot.remainingQuantity * txnQty > 0)) {
            // Buy transaction ignores existing open Long lots
            // reverse Buy transaction ignores existing open Short lots
            return;
        }

        if ((!isBuy && lot.remainingQuantity * txnQty < 0)) {
            // Sell transaction ignores existing open Short lots
            // reverse Sell transaction ignores existing open Long lots
            return;
        }

        const remainingQty = isBuy ? Math.min(0, lot.remainingQuantity + txnQty) : Math.max(0, lot.remainingQuantity - txnQty);
        txnQty = Math.max(0, txnQty - Math.abs(lot.remainingQuantity));
        lot.realizedPnl = (lot.realizedPnl || 0) + (txn.price || 0 - lot.openPrice) * (lot.remainingQuantity - remainingQty) * getMultipler(txn.instrumentId);
        lot.remainingQuantity = remainingQty;
        lot.cost = lot.openPrice * lot.remainingQuantity * getMultipler(lot.instrumentId) + (lot.feesAllocated || 0);        
        lot.cashCollateral = (lot.cashCollateral || 0) * lot.remainingQuantity / lot.openQuantity;
        releaseCollateral += (lot.cashCollateral || 0) * (lot.openQuantity - lot.remainingQuantity) / lot.openQuantity;
        updateLotsPlan.push(lot);

    });

    // allocate fee to the first lot for simplicity
    if (updateLotsPlan.length > 0 && updateLotsPlan[0] && txnFee !== 0) {
        updateLotsPlan[0].feesAllocated = (updateLotsPlan[0].feesAllocated || 0) + txnFee;
        txnFee = 0;
    }

    if (txnQty !== 0) {
        // create lot for the remain txnQty
        txn.quantity = txnQty;
        txn.fees = txnFee;
        txn.cashCollateral = (txn.cashCollateral || 0) - releaseCollateral;
        const lotCreate = await createLot(txn, tableName);
        transactItems.push(...lotCreate);
    }

    // process updateLotsPlan
    updateLotsPlan.forEach(lot => {
        transactItems.push({
            Update: {
                TableName: tableName,
                Key: { "PK": lot.PK, "SK": lot.SK },
                UpdateExpression: "SET remainingQuantity = :remainingQuantity, \
                realizedPnl = :realizedPnl, \
                feesAllocated = :feesAllocated,\
                cashCollateral = :cashCollateral,\
                lastUpdated = :lastUpdated, cost = :cost",
                ExpressionAttributeValues: {
                    ":remainingQuantity": lot.remainingQuantity,
                    ":realizedPnl": lot.realizedPnl,
                    ":feesAllocated": lot.feesAllocated,
                    ":cashCollateral": lot.cashCollateral,
                    ":lastUpdated": new Date().toISOString(),
                    ":cost": lot.cost
                }
            }
        });

        // create PnL record for closed quantity
        const pnlCreate = createPnl(lot, txn, tableName);
        transactItems.push(...pnlCreate);
    });

    // sum up remainingQty for all the lots in the openLots, including the newly created lot
    const totalRemainingQty = openLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0) + (txnQty || 0);
    const totalCost = openLots.reduce((sum, lot) => sum + lot.cost, 0) + (txn.quantity! * txn.price! * getMultipler(txn.instrumentId) + (txn.fees || 0));
    const lotEntity = {
        userId: txn.userId!,
        accountId: txn.accountId,
        instrumentId: txn.instrumentId,
        remainingQuantity: totalRemainingQty,
        cost: totalCost
    }
    const positionUpdate = await updatePosition(lotEntity as LotEntity, tableName);
    transactItems.push(...positionUpdate);

    if (releaseCollateral !== 0) {
        const releaseItems = releaseCashCollateral(txn.userId!, txn.accountId, tableName, releaseCollateral);
        transactItems.push(...releaseItems);
    }

    return transactItems;
}