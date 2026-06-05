import { putItem, queryTable } from "@shared/clients/dynamoDb";
import { NewsEventEntity, NewsType } from "@shared/models/newsEvent";
import { OptionContractEntity } from "@shared/models/optionContract";
import { getDividentEventFromAlphaVantage } from "@shared/utils/alphaVantageApiHelper";
import { EntityTypeNewsEvent, newsEventPartitionKey, newsEventSortKey } from "@shared/utils/getKeys";
import { getCurrentMarketPrice } from "@shared/utils/getMarketPrice";

export const processNewsEventForOption = async (
    tableName: string,
    userId: string,
    optionContract: OptionContractEntity,
    priceCache: Record<string, number>): Promise<string> => {

    let log = "";
    let price = 0;

    const instrumentId = optionContract.underlying;
    const endDate = optionContract.expirationDate.toISOString().slice(0, 10);

    if (priceCache[instrumentId]) {
        price = priceCache[instrumentId];
    }
    else {
        const marketPriceData = await getCurrentMarketPrice(instrumentId);
        if (marketPriceData.success) {
            price = marketPriceData.price || 0;
            priceCache[instrumentId] = price;
            log += `Market price for ${instrumentId} is ${price} on ${marketPriceData.asOfDate}, from ${marketPriceData.source}. `;
        } else {
            log += `Market price not available for ${instrumentId}: ${marketPriceData.message}. `;
        }
    }

    const param = {
        TableName: tableName,
        KeyConditionExpression: "PK = :pkValue AND SK = :skValue",
        FilterExpression: "instrumentId = :symbol AND newsType = :newsType",
        ExpressionAttributeValues: {
            ":pkValue": newsEventPartitionKey(userId),
            ":skValue": newsEventSortKey(endDate),
            ":symbol": instrumentId,
            ":newsType": NewsType.OPTION
        }
    };

    const queryResult = await queryTable(param);
    const news = queryResult.Items as NewsEventEntity[];
    if (news && news.length > 0) {
        for (const n of news) {
            n.currentPrice = price;
            try {
                await putItem(n, tableName);
                log += `Updated news for ${optionContract.instrumentId}. `;
            } catch (error) {
                console.error(error);
                log += `Failed to save news for ${optionContract.instrumentId}. `;
            }
        }
    } else {
        const n: NewsEventEntity = {
            PK: newsEventPartitionKey(userId),
            SK: newsEventSortKey(endDate),
            createdAt: (new Date()).toISOString(),
            entityType: EntityTypeNewsEvent,
            newsType: NewsType.OPTION,
            userId: userId,
            instrumentId: instrumentId,
            endDate: endDate,
            currentPrice: price,
        };

        try {
            await putItem(n, tableName);
            log += `Created news for ${optionContract.instrumentId}.`;
        } catch (error) {
            console.error(error);
            log += `Failed to save news for ${optionContract.instrumentId}.`;
        }
    }

    return log;
}


export const processNewsEventForDividend = async (
    tableName: string,
    userId: string,
    instrumentId: string,
    lastApiCallTime: number,
): Promise<string> => {

    let log = "";
    const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;

    const param = {
        TableName: tableName,
        KeyConditionExpression: "PK = :pkValue AND SK >= :skValue",
        FilterExpression: "instrumentId = :symbol AND newsType = :newsType",
        ExpressionAttributeValues: {
            ":pkValue": newsEventPartitionKey(userId),
            ":skValue": newsEventSortKey((new Date()).toISOString().slice(0, 10)),
            ":symbol": instrumentId,
            ":newsType": NewsType.DIV
        }
    };

    const queryResult = await queryTable(param);
    const news = queryResult.Items as NewsEventEntity[];
    if (!news || news.length < 1) {


        const now = Date.now();
        const diff = now - lastApiCallTime;
        if (lastApiCallTime !== 0 && diff < 1000) {
            const waitTime = 1000 - diff;
            console.log(`Waiting ${waitTime} ms...`);
            await sleep(waitTime);
        }

        const dividendEvent = await getDividentEventFromAlphaVantage(instrumentId, alphaVantageApiKey);
        if (dividendEvent.success) {
            const endDate = dividendEvent.paymentDate!;

            const n: NewsEventEntity = {
                PK: newsEventPartitionKey(userId),
                SK: newsEventSortKey(endDate),
                createdAt: (new Date()).toISOString(),
                entityType: EntityTypeNewsEvent,
                newsType: NewsType.DIV,
                userId: userId,
                instrumentId: instrumentId,
                endDate: endDate,
                recordDate: dividendEvent.recordDate!,
                paymentDate: dividendEvent.paymentDate!,
                dividendAmount: dividendEvent.amount!
            };

            try {
                await putItem(n, tableName);
                log += `Processed dividend news for ${instrumentId}. `;
            } catch (error) {
                console.error(error);
                log += `Failed to save news for ${instrumentId}. `;
            }
        } else {
            log += `Failed to get dividend news for ${instrumentId}: ${dividendEvent.message}. `;
        }
    } else {
        log += `Dividend news for ${instrumentId} already exists. `;
    }

    return log;
}


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
