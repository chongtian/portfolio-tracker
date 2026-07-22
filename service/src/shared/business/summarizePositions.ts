import { TransactWriteCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { getItemsByPK, getItemsByPKandSK, putItem, queryTable, sendCommand, TransactItems, updateItem } from "@shared/clients/dynamoDb";
import { AccountEntity } from "@shared/models/account";
import { PositionEntity } from "@shared/models/position";
import { accountPartitionKey, EntityTypeAccount, EntityTypePosition, EventBridgeScheduleSource, positionHistorySortKey, positionPartitionKey, processedSortKey, summaryHistorySortKey, summaryPartitionKey, summarySortKey } from "@shared/utils/getKeys";
import { getCurrentMarketPrice } from "@shared/utils/getMarketPrice";
import { parseOptionContract } from "@shared/utils/parseOptionContract";
import { expireOptionPosition } from "./expireOptionPosition";
import { getMultipler } from "@shared/utils/getMultipler";
import { SummaryEntity } from "@shared/models/summary";
import { preciseRound } from "@shared/utils/mathHelper";
import { processNewsEventForDividend, processNewsEventForOption } from "./processNewsEvent";

export const summarizePositions = async (userId: string, tableName: string, source?: string, currentDate?: Date): Promise<string[]> => {

    const logs: string[] = [];
    const accounts = await getItemsByPK<AccountEntity>(accountPartitionKey(userId), tableName, EntityTypeAccount);
    currentDate = currentDate || new Date();

    let apiCallTime = (new Date()).getTime();

    const priceCache: Record<string, number> = {};

    // check if other process has locked the table
    var locked = false;
    const existingLocks = await getItemsByPKandSK(accountPartitionKey(userId), processedSortKey(), tableName);
    if (existingLocks && existingLocks.length > 0 && existingLocks[0] && existingLocks[0].isProcessing === true) {
        locked = true;
        if (typeof existingLocks[0].createdAt === "string") {
            const diffMs = (Date.now()) - (new Date(existingLocks[0].createdAt)).getTime();
            if (diffMs > 10 * 60 * 1000) {
                // if the lock is older than 10 minutes, we assume the previous process has failed and we can proceed
                logs.push('There is a lock older than 10 minutes. Proceeding with summarization.');
                locked = false;
            }
        }
    }

    if (locked) {

        logs.push('Another process is summarizing positions. Skipping this process.');
        return logs;

    } else {

        const lockTable = {
            PK: accountPartitionKey(userId),
            SK: processedSortKey(),
            createdAt: (new Date()).toISOString(),
            event: 'summarize_positions',
            source: source ?? 'unknown',
            isProcessing: true
        }

        try {
            await putItem(lockTable, tableName);
        } catch (error) {
            console.error(error);
            logs.push('Failed to summarize positions.');
            return logs;
        }
    }

    try {

        for (const account of accounts) {
            const accountId = account.accountId;
            const accountName = account.accountName;

            if (account.active !== true) {
                logs.push(`Account ${accountName} is inactive, skipping`);
                continue;
            }

            logs.push(`Updating positions for account ${accountName}.`);

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
            logs.push(`${accountName}: Found ${openPositions.length} open positions.`);

            for (const position of openPositions) {
                const instrumentId = position.instrumentId;
                logs.push(`${accountName}: Updating position for instrument ${instrumentId}.`);

                // check if the instrument is an option contract and if the contract is expired
                const optionContract = parseOptionContract(instrumentId);
                if (optionContract) {
                    const { expirationDate } = optionContract;
                    if (
                        (expirationDate.toISOString().slice(0, 10) < currentDate.toISOString().slice(0, 10)) ||
                        (expirationDate.toISOString().slice(0, 10) <= currentDate.toISOString().slice(0, 10) && source === EventBridgeScheduleSource)
                    ) {

                        try {
                            const expireOptionTransactItems = await expireOptionPosition(position, expirationDate.toISOString(), tableName);
                            await sendCommand(new TransactWriteCommand({ TransactItems: expireOptionTransactItems }));
                            logs.push(`${accountName}: Option ${instrumentId} has beend expired.`);
                        } catch (error) {
                            console.error(`Failed to expire position ${position.PK}#${position.SK}:`, error);
                            logs.push(`${accountName}: Failed to expire position for instrument ${instrumentId}`);
                        }

                        continue;
                    }

                    // for open option position, create option news
                    const msg = await processNewsEventForOption(tableName, position.userId, optionContract, priceCache);
                    logs.push(`${accountName}: ${msg}`);
                } else {
                    // create dividend news
                    try {
                        const msg = await processNewsEventForDividend(tableName, position.userId, instrumentId, apiCallTime);
                        logs.push(`${accountName}: ${msg}`);
                        apiCallTime = (new Date()).getTime();
                    } catch (error) {
                        console.error(`Failed to get dividend news for instrument ${instrumentId}:`, error);
                        logs.push(`${accountName}: Failed to get dividend news for instrument ${instrumentId}.`);
                    }
                }

                // get market price for the instrument
                if (priceCache[instrumentId]) {
                    // get market price from cache
                    position.marketPrice = priceCache[instrumentId];
                }
                else {
                    const marketPriceData = await getCurrentMarketPrice(instrumentId);

                    if (marketPriceData.success) {
                        const price = marketPriceData.price;
                        priceCache[instrumentId] = price!;
                        position.marketPrice = price!;
                        logs.push(`${accountName}: Market price for ${instrumentId} is ${price} on ${marketPriceData.asOfDate}, from ${marketPriceData.source}`);
                    } else {
                        logs.push(`${accountName}: Market price not available for ${instrumentId}: ${marketPriceData.message}`);
                        const price = position.totalCost / position.quantity / getMultipler(instrumentId); // fallback to average cost if market price not available    
                        logs.push(`${accountName}: Using average cost as market price for ${instrumentId}: ${price}`);
                        priceCache[instrumentId] = price;
                        position.marketPrice = price;
                    }

                }

                if (position.marketPrice) {
                    try {
                        position.marketValue = preciseRound(position.marketPrice * position.quantity * getMultipler(instrumentId)) || 0;
                        position.unrealizedPnl = preciseRound(position.marketValue - position.totalCost) || 0;

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
                        logs.push(`${accountName}: Position for instrument ${instrumentId} updated successfully`);

                        // Save the Position as a Position History
                        position.SK = positionHistorySortKey(instrumentId, currentDate.toISOString().slice(0, 10));
                        position.asOfDate = currentDate.toISOString().slice(0, 10);
                        position.lastUpdated = (new Date()).toISOString();
                        await putItem(position, tableName);

                    } catch (error) {
                        console.error(`Failed to update position ${position.PK}#${position.SK}:`, error);
                        logs.push(`${accountName}: Failed to update position for instrument ${instrumentId}`);
                    }
                }

                logs.push(`${accountName}: Completed updating position for instrument ${instrumentId}.`);
            }

            // update Summary
            try {
                const totalPositionsValue = preciseRound(openPositions.reduce((sum, pos) => sum + (pos.marketValue || 0), 0));
                const totalUnrealizedPnl = preciseRound(openPositions.reduce((sum, pos) => sum + (pos.unrealizedPnl || 0), 0));

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
                logs.push(`${accountName}: Summary updated successfully`);

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
                logs.push(`${accountName}: Failed to update summary for account ${accountId}`);
            }
        }

    } catch (error) {
        console.error(error);
        logs.push(`$Failed to summarize position: ${error}`);
    }

    // unlock
    const unlockTable = {
        PK: accountPartitionKey(userId),
        SK: processedSortKey(),
        createdAt: (new Date()).toISOString(),
        event: 'summarize_positions',
        source: source ?? 'unknown',
        logs: logs
    }

    try {

        await putItem(unlockTable, tableName);

    } catch (error) {
        console.error(error);
        logs.push('Failed to unlock table.');
    }

    return logs;

}