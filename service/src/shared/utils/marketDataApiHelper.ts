import { MarketPrice } from "@shared/models/marketPrice";
import { OptionContractEntity } from "@shared/models/optionContract";

interface MarketDataOptionResponse {
    s: string; // status, shall be ok
    optionSymbol: string[];
    last: number[]; // last price
    updated: string[];
}

interface MarketDataStockResponse {
    s: string; // status, shall be ok
    symbol: string[];
    mid: number[];
    updated: string[];
}

interface MarketDataStockFundHistoryResponse {
    s: string; // status, shall be ok
    t: string[]; // trade dates in Unix timestamp
    c: number[]; // close prices
}

export const getOptionContractPrice = async (optionContract: OptionContractEntity, marketDataApiKey?: string): Promise<MarketPrice> => {
    const instrumentId = optionContract.instrumentId;

    const result: MarketPrice = {
        success: false,
        instrumentId: instrumentId,
        isOption: true
    };

    result.source = 'MARKET_DATA';

    if (!marketDataApiKey) {
        result.success = false;
        result.message = 'MARKETDATA_API_KEY is not given.';
        return result;
    }

    const underlying = optionContract!.underlying.toUpperCase().trim();
    const expiration = optionContract!.expirationDate.toISOString().slice(0, 10);
    const side = optionContract!.optionType.toLowerCase();
    const strike = optionContract!.strikePrice;
    const url = `https://api.marketdata.app/v1/options/chain/${underlying}/?expiration=${expiration}&side=${side}&strike=${strike}&dateformat=timestamp`;
    console.debug(`Calling API: ${url}`);

    const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${marketDataApiKey}`, Accept: "application/json" },
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error(`Failed to get market price from api for ${instrumentId}: ${errText}`);
        result.success = false;
        result.message = `Failed to get market price from api for ${instrumentId}: ${errText}`;
    } else {
        const data = (await res.json()) as MarketDataOptionResponse;
        if (data?.s !== 'ok' || data?.optionSymbol?.[0] !== instrumentId || !data?.last?.[0]) {
            console.error(`Failed to get market price from api for ${instrumentId}`);
            result.success = false;
            result.message = `Failed to get market price from api for ${instrumentId}`;
        } else {
            result.success = true;
            result.price = data?.last?.[0];
            result.asOfDate = data?.updated?.[0];
        }
    }

    return result;
}

export const getStockPrice = async (instrumentId: string, marketDataApiKey?: string): Promise<MarketPrice> => {

    const result: MarketPrice = {
        success: false,
        instrumentId: instrumentId,
        isOption: false
    };

    result.source = 'MARKET_DATA';

    if (!marketDataApiKey) {
        result.success = false;
        result.message = 'MARKETDATA_API_KEY is not given.';
        return result;
    }

    const url = `https://api.marketdata.app/v1/stocks/prices/${instrumentId}?dateformat=timestamp&extended=false`;
    console.debug(`Calling API: ${url}`);

    const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${marketDataApiKey}`, Accept: "application/json" },
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error(`Failed to get market price from api for ${instrumentId}: ${errText}`);
        result.success = false;
        result.message = `Failed to get market price from api for ${instrumentId}: ${errText}`;
    } else {
        const data = (await res.json()) as MarketDataStockResponse;
        if (data?.s !== 'ok' || data?.symbol?.[0] !== instrumentId || !data?.mid?.[0]) {
            console.error(`Failed to get market price from api for ${instrumentId}`);
            result.success = false;
            result.message = `Failed to get market price from api for ${instrumentId}`;
        } else {
            result.success = true;
            result.price = data?.mid?.[0];
            result.asOfDate = data?.updated?.[0];
        }
    }

    return result;
}

export const getFundStockHistoricalPrice = async (instrumentId: string, marketDataApiKey?: string): Promise<MarketPrice> => {

    const result: MarketPrice = {
        success: false,
        instrumentId: instrumentId,
        isOption: false
    };

    result.source = 'MARKET_DATA';

    if (!marketDataApiKey) {
        result.success = false;
        result.message = 'MARKETDATA_API_KEY is not given.';
        return result;
    }

    const from = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 5th day before today
    const to = (new Date()).toISOString().slice(0, 10);
    // if the length of symbol >=5, it is almost positive this is a mutual fund
    const url = instrumentId.length >= 5 ?
        `https://api.marketdata.app/v1/funds/candles/D/${instrumentId}/?from=${from}&to=${to}&dateformat=timestamp` :
        `https://api.marketdata.app/v1/stocks/candles/D/${instrumentId}/?from=${from}&to=${to}&dateformat=timestamp`;
    console.debug(`Calling API: ${url}`);

    const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${marketDataApiKey}`, Accept: "application/json" },
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error(`Failed to get market price from api for ${instrumentId}: ${errText}`);
        result.success = false;
        result.message = `Failed to get market price from api for ${instrumentId}: ${errText}`;
    } else {
        const data = (await res.json()) as MarketDataStockFundHistoryResponse;
         if (!data || data.s !== 'ok' || !data.c || data.c.length === 0) {
            console.error(`Failed to get market price from api for ${instrumentId}`);
            result.success = false;
            result.message = `Failed to get market price from api for ${instrumentId}`;
        } else {
            result.success = true;
            result.price = data?.c?.[data.c.length - 1]!;
            result.asOfDate = data?.t?.[data.t.length - 1];
        }
    }

    return result;
}