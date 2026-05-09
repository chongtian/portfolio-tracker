import { queryTable, TransactItems } from "@shared/clients/dynamoDb";
import { LotEntity } from "@shared/models/lot";
import { createPnl } from "./transactionHandlers/createPnl";
import { AssetType, TransactionEntity, TransactionType } from "@shared/models/transaction";
import { releaseCashCollateral } from "./transactionHandlers/releaseCashCollateral";
import { EntityTypeLot, lotPartitionKey } from "@shared/utils/getKeys";
import { PositionEntity } from "@shared/models/position";
import { preciseRound } from "@shared/utils/mathHelper";

export const expireOptionPosition = async (position: PositionEntity, expirationDate: string, tableName: string): Promise<TransactItems> => {

    const transactItems: TransactItems = [];

    // get all open lots
    const param = {
        TableName: tableName,
        KeyConditionExpression: "PK = :pkValue AND begins_with(SK, :entityType)",
        FilterExpression: "remainingQuantity <> :zero",
        ExpressionAttributeValues: {
            ":pkValue": lotPartitionKey(position.userId, position.accountId, position.instrumentId),
            ":entityType": EntityTypeLot,
            ":zero": 0
        }
    };

    const queryResult = await queryTable(param);
    const openLots = queryResult.Items as LotEntity[];

    let releaseCollateral = 0;
    openLots.forEach(lot => {
        lot.realizedPnl = -1 * lot.cost;
        releaseCollateral += lot.cashCollateral || 0;
        lot.cashCollateral = 0;

        transactItems.push({
            Update: {
                TableName: tableName,
                Key: { "PK": lot.PK, "SK": lot.SK },
                UpdateExpression: "SET remainingQuantity = :remainingQuantity, \
                    realizedPnl = :realizedPnl",
                ExpressionAttributeValues: {
                    ":remainingQuantity": 0,
                    ":realizedPnl": -1 * lot.cost
                }
            }
        });

        // create PnL record for closed quantity
        const dummyTxn: TransactionEntity = {
            PK: "",
            SK: "EXPIRATION",
            createdAt: new Date().toISOString(),
            entityType: "",
            userId: "",
            accountId: "",
            txnDate: expirationDate,
            transactionType: TransactionType.EXPIRATION,
            instrumentId: "",
            quantity: 0,
            price: 0,
            fees: 0,
            txnId: "",
            currency: "",
            assetType: AssetType.OPTION
        };
        const pnlCreate = createPnl(lot, dummyTxn, tableName);
        transactItems.push(...pnlCreate);
    });

    const totalRealizedPnl = preciseRound(openLots.reduce((sum, lot) => sum + (lot.realizedPnl || 0), 0));

    transactItems.push({
        Update: {
            TableName: tableName,
            Key: {
                PK: position.PK,
                SK: position.SK
            },
            UpdateExpression: "SET lastUpdated = :lastUpdated, realizedPnl = if_not_exists(realizedPnl, :zero) + :realizedPnl, \
                quantity = :zero, marketPrice = :zero, marketValue = :zero ",
            ExpressionAttributeValues: {
                ":lastUpdated": new Date().toISOString(),
                ":zero": 0,
                ":realizedPnl": totalRealizedPnl
            }
        }
    });

    if (releaseCollateral !== 0) {
        const releaseItems = releaseCashCollateral(position.userId!, position.accountId, tableName, releaseCollateral);
        transactItems.push(...releaseItems);
    }

    return transactItems;

}