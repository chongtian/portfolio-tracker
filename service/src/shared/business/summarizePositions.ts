import { TransactWriteCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { getItemsByPK, getItemsByPKandSK, putItem, queryTable, sendCommand, TransactItems, updateItem } from "@shared/clients/dynamoDb";
import { AccountEntity } from "@shared/models/account";
import { PositionEntity } from "@shared/models/position";
import { accountPartitionKey, EntityTypeAccount, EntityTypePosition, positionHistorySortKey, positionPartitionKey, summaryHistorySortKey, summaryPartitionKey, summarySortKey } from "@shared/utils/getKeys";
import { getCurrentMarketPrice } from "@shared/utils/getMarketPrice";
import { parseOptionContract } from "@shared/utils/parseOptionContract";
import { expireOptionPosition } from "./expireOptionPosition";
import { getMultipler } from "@shared/utils/getMultipler";
import { SummaryEntity } from "@shared/models/summary";

export const summarizePositions = async (userId: string, tableName: string, currentDate?: Date): Promise<Record<string, string>> => {

    const messages: Record<string, string> = {};
    const accounts = await getItemsByPK<AccountEntity>(accountPartitionKey(userId), tableName, EntityTypeAccount);
    currentDate = currentDate || new Date();

    const priceCache: Record<string, number> = {};

    for (const account of accounts) {
        const accountId = account.accountId;
        const accountName = account.accountName;

        if (account.active !== true) {
            messages[accountId] = `Account ${accountName} is inactive, skipping`;
            continue;
        }

        messages[accountId] = `Updating positions for account ${accountName}.`;

        // get all open positions for the account
        const param = {
            TableName: tableName,
            KeyConditionExpression: "PK = :pkValue AND begins_with(SK, :entityType)",
            FilterExpression: "quantity <> :zero AND attribute_not_exists(asOfDate)",
            ExpressionAttributeValues: {
                ":pkValue": positionPartitionKey(userId, accountId),
                ":entityType": EntityTypePosition,
                ":zero": 0
            }
        };

        const queryResult = await queryTable(param);
        const openPositions = queryResult.Items as PositionEntity[];
        messages[accountId] += `\nFound ${openPositions.length} open positions.`;

        for (const position of openPositions) {
            const instrumentId = position.instrumentId;
            messages[accountId] += `\nUpdating position for instrument ${instrumentId}.`;

            // check if the instrument is an option contract and if the contract is expired
            const optionContract = parseOptionContract(instrumentId);
            if (optionContract) {
                const { expirationDate } = optionContract;
                if (expirationDate.toISOString().slice(0, 10) < currentDate.toISOString().slice(0, 10)) {

                    try {
                        const expireOptionTransactItems = await expireOptionPosition(position, expirationDate.toISOString(), tableName);
                        await sendCommand(new TransactWriteCommand({ TransactItems: expireOptionTransactItems }));
                        messages[accountId] += `\nOption ${instrumentId} has beend expired.`;
                    } catch (error) {
                        console.error(`Failed to expire position ${position.PK}#${position.SK}:`, error);
                        messages[accountId] += `\nFailed to expire position for instrument ${instrumentId}`;
                    }

                    continue;
                }
            }

            // get market price for the instrument
            if (priceCache[instrumentId]) {
                // get market price from cache
                position.marketPrice = priceCache[instrumentId];
                // messages[accountId] += `\nUsing cached market price for instrument ${instrumentId}: ${position.marketPrice}.`
            }
            else {
                // messages[accountId] += `\nGetting market price for instrument ${instrumentId}.`;
                let price = await getCurrentMarketPrice(instrumentId);
                if (price) {
                    messages[accountId] += `\nMarket price for instrument ${instrumentId} is ${price}`;
                } else {
                    messages[accountId] += `\nMarket price not available for instrument ${instrumentId}`;
                    price = position.totalCost / position.quantity / getMultipler(instrumentId); // fallback to average cost if market price not available    
                    messages[accountId] += `\nUsing average cost as market price for instrument ${instrumentId}: ${price}`;
                }

                priceCache[instrumentId] = price;
                position.marketPrice = price;
            }

            if (position.marketPrice) {
                try {
                    position.marketValue = position.marketPrice * position.quantity * getMultipler(instrumentId);
                    position.unrealizedPnl = position.marketValue - position.totalCost;

                    const param: UpdateCommandInput = {
                        TableName: tableName,
                        Key: {
                            PK: position.PK, SK: position.SK
                        },
                        UpdateExpression: "SET marketPrice = :marketPrice, marketValue = :marketValue, unrealizedPnl = :unrealizedPnl, lastUpdated = :lastUpdated",
                        ExpressionAttributeValues: {
                            ":marketPrice": position.marketPrice,
                            ":marketValue": position.marketValue,
                            ":unrealizedPnl": position.unrealizedPnl,
                            ":lastUpdated": new Date().toISOString()
                        }
                    };

                    await updateItem(param);
                    messages[accountId] += `\nPosition for instrument ${instrumentId} updated successfully`;

                    // Save the Position as a Position History
                    position.SK = positionHistorySortKey(instrumentId, currentDate.toISOString().slice(0, 10));
                    position.asOfDate = currentDate.toISOString().slice(0, 10);
                    position.lastUpdated = (new Date()).toISOString();
                    await putItem(position, tableName);                    

                } catch (error) {
                    console.error(`Failed to update position ${position.PK}#${position.SK}:`, error);
                    messages[accountId] += `\nFailed to update position for instrument ${instrumentId}`;
                }
            }
        }

        // update Summary
        try {
            const totalPositionsValue = openPositions.reduce((sum, pos) => sum + (pos.marketValue || 0), 0);
            const totalUnrealizedPnl = openPositions.reduce((sum, pos) => sum + (pos.unrealizedPnl || 0), 0);

            // Update the current Summary
            const updateSummaryParam: UpdateCommandInput = {
                TableName: tableName,
                Key: {
                    PK: summaryPartitionKey(userId, accountId), SK: summarySortKey()
                },
                UpdateExpression: "SET totalPositionsValue = :totalPositionsValue, unrealizedPnl = :totalUnrealizedPnl, lastUpdated = :lastUpdated",
                ExpressionAttributeValues: {
                    ":totalPositionsValue": totalPositionsValue,
                    ":totalUnrealizedPnl": totalUnrealizedPnl,
                    ":lastUpdated": new Date().toISOString()
                }
            };
            await updateItem(updateSummaryParam);
            messages[accountId] += `\nSummary updated successfully`;

            // Get the current Summary and save it as a Summary History
            const summaryItems = await getItemsByPKandSK<SummaryEntity>(summaryPartitionKey(userId, accountId), summarySortKey(), tableName);
            if (summaryItems && summaryItems.length > 0 && summaryItems[0]) {
                const summary = summaryItems[0];
                summary.SK = summaryHistorySortKey(currentDate.toISOString().slice(0, 10));
                summary.asOfDate = currentDate.toISOString().slice(0, 10);
                summary.createdAt = (new Date()).toISOString();
                await putItem(summary, tableName);
            }

        } catch (error) {
            console.error(`Failed to update summary for account ${accountId}:`, error);
            messages[accountId] += `\nFailed to update summary for account ${accountId}`;
        }
    }

    return messages;

}