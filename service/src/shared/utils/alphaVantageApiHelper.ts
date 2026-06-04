import { DividendEvent } from "@shared/models/newsEvent";
import { MarketPrice } from "@shared/models/marketPrice";

interface AlphaVantageTimeSeriesApiResponse {
    "Meta Data": MetaData;
    "Time Series (Daily)": TimeSeriesDaily;
}

interface MetaData {
    "1. Information": string;
    "2. Symbol": string;
    "3. Last Refreshed": string;
    "4. Output Size": string;
    "5. Time Zone": string;
}

interface TimeSeriesDaily {
    [date: string]: DailyData;
}

interface DailyData {
    "1. open": string;
    "2. high": string;
    "3. low": string;
    "4. close": string;
    "5. volume": string;
}

interface AlphaVantageStockPriceData {
    meta: {
        information: string;
        symbol: string;
        lastRefreshed: string;
        outputSize: string;
        timeZone: string;
    };
    timeSeries: CleanDailyData[];
}

interface CleanDailyData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface AlphaVantageDividendEventApiResponse {
    symbol: string;
    data: AlphaVantageDividendEventData[];
}

interface AlphaVantageDividendEventData {
    ex_dividend_date: string;
    declaration_date: string;
    record_date: string;
    payment_date: string;
    amount: number;
}

const transformAlphaVantageApiResponse = (raw: AlphaVantageTimeSeriesApiResponse): AlphaVantageStockPriceData => {
    const meta = raw["Meta Data"];

    const toNumber = (value: string): number => {
        const n = Number(value);
        return isNaN(n) ? 0 : n;
    };

    const timeSeries: CleanDailyData[] = Object.entries(
        raw["Time Series (Daily)"]
    ).map(([date, data]) => ({
        date,
        open: toNumber(data["1. open"]),
        high: toNumber(data["2. high"]),
        low: toNumber(data["3. low"]),
        close: toNumber(data["4. close"]),
        volume: toNumber(data["5. volume"]),
    }));

    // should already be sorted
    // timeSeries.sort((a, b) => b.date.localeCompare(a.date));

    return {
        meta: {
            information: meta["1. Information"],
            symbol: meta["2. Symbol"],
            lastRefreshed: meta["3. Last Refreshed"],
            outputSize: meta["4. Output Size"],
            timeZone: meta["5. Time Zone"],
        },
        timeSeries,
    };
}

export const getDividentEventFromAlphaVantage = async (instrumentId: string, alphaVantageApiKey?: string): Promise<DividendEvent> => {
    const result: DividendEvent = {
        instrumentId: instrumentId,
        success: false
    };

    result.source = 'ALPHA_VANTAGE';

    if (!alphaVantageApiKey) {
        result.success = false;
        result.message = 'ALPHA_VANTAGE_API_KEY is not given.';
        return result;
    }

    const url = `https://www.alphavantage.co/query?function=DIVIDENDS&symbol=${instrumentId}&apikey=${alphaVantageApiKey}`;
    const res = await fetch(url, {
        method: "GET"
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error(`Failed to get dividend event from api for ${instrumentId}: ${errText}`);
        result.success = false;
        result.message = `Failed to get dividend event from api for ${instrumentId}: ${errText}`;
    } else {
        const raw = (await res.json()) as AlphaVantageDividendEventApiResponse;

        if(raw && raw.data && raw.data.length > 0 && raw.data[0] && raw.data[0].amount && raw.data[0].payment_date != 'None'){
            result.amount = raw.data[0].amount;
            result.recordDate = raw.data[0].record_date;
            result.paymentDate = raw.data[0].payment_date;
            result.success = true;
        } else {
            console.error(`Failed to get dividend event from api for ${instrumentId}.${JSON.stringify(raw)}`);
            result.success = false;
            result.message = `Failed to get dividend event from api for ${instrumentId}. ${JSON.stringify(raw).substring(0,100)} ...`;
        }
        
    }

    return result;
}

export const getStockFundPriceFromAlphaVantage = async (instrumentId: string, alphaVantageApiKey?: string): Promise<MarketPrice> => {
    const result: MarketPrice = {
        success: false,
        instrumentId: instrumentId,
        isOption: false
    };

    result.source = 'ALPHA_VANTAGE';

    if (!alphaVantageApiKey) {
        result.success = false;
        result.message = 'ALPHA_VANTAGE_API_KEY is not given.';
        return result;
    }

    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${instrumentId}&apikey=${alphaVantageApiKey}`;
    const res = await fetch(url, {
        method: "GET"
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error(`Failed to get market price from api for ${instrumentId}: ${errText}`);
        result.success = false;
        result.message = `Failed to get market price from api for ${instrumentId}: ${errText}`;
    } else {
        const raw = (await res.json()) as AlphaVantageTimeSeriesApiResponse;
        const data = transformAlphaVantageApiResponse(raw);

        if (!data.timeSeries[0]?.close) {
            console.error(`Failed to get market price from api for ${instrumentId}`);
            result.success = false;
            result.message = `Failed to get market price from api for ${instrumentId}`;
        } else {
            result.price = data.timeSeries[0]?.close;
            result.asOfDate = data.meta.lastRefreshed;
            result.success = true;
        }
    }

    return result;
}