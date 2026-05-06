import { parseOptionContract } from "./parseOptionContract";

interface MarketDataStockResponse {
    s: string; // status, shall be ok
    t: number[]; // trade dates in Unix timestamp
    c: number[]; // close prices
};

interface MarketDataOptionResponse {
    s: string; // status, shall be ok
    optionSymbol: string[];
    last: number[]; // last price
};

export const getCurrentMarketPrice = async (instrumentId: string): Promise<number | null> => {

    let price: number | null = null;

    const marketDataApiKey = process.env.MARKETDATA_API_KEY;

    if (marketDataApiKey) {

        console.debug("api key is found, using MarketData API ...");

        const optionContract = parseOptionContract(instrumentId);

        if (optionContract) {
            const underlying = optionContract.underlying.toUpperCase().trim();
            const expiration = optionContract.expirationDate.toISOString().slice(0, 10);
            const side = optionContract.optionType.toLowerCase();
            const strike = optionContract.strikePrice;
            const url = `https://api.marketdata.app/v1/options/chain/${underlying}/?expiration=${expiration}&side=${side}&strike=${strike}`;
            console.debug(`Calling API: ${url}`);

            const res = await fetch(url, {
                method: "GET",
                headers: { Authorization: `Bearer ${marketDataApiKey}`, Accept: "application/json" },
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`Failed to get market price from api for ${instrumentId}: ${errText}`);
            } else {
                const data = (await res.json()) as MarketDataOptionResponse;
                if (data?.s !== 'ok' || data?.optionSymbol?.[0] !== instrumentId) {
                    console.error(`Failed to get market price from api for ${instrumentId}`);
                }

                price = data?.last?.[0] || null;
            }

        } else {
            const from = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 5th day before today
            const to = (new Date()).toISOString().slice(0, 10);
            // if the length of symbol >=5, it is almost positive this is a mutual fund
            const url = instrumentId.length >= 5 ?
                `https://api.marketdata.app/v1/funds/candles/D/${instrumentId}/?from=${from}&to=${to}` :
                `https://api.marketdata.app/v1/stocks/candles/D/${instrumentId}/?from=${from}&to=${to}`;
            console.debug(`Calling API: ${url}`);

            const res = await fetch(url, {
                method: "GET",
                headers: { Authorization: `Bearer ${marketDataApiKey}`, Accept: "application/json" },
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`Failed to get market price from api for ${instrumentId}: ${errText}`);
            } else {
                const data = (await res.json()) as MarketDataStockResponse;
                if (data && data.s === 'ok' && data.c && data.c.length > 0) {
                    price = data.c[data.c.length - 1]!;
                } else {
                    console.debug(`Failed to get market price from api for ${instrumentId}.`);
                }
            }
        }

    }

    if (!price) {

        console.debug("api key does not exist or api call failed, fall back to the temporary solution.");

        if (parseOptionContract(instrumentId)) {
            console.debug(`Instrument ${instrumentId} is an option contract, fetching market price has not been implemented...`);
            return null;
        }

        const url = `https://finance.yahoo.com/quote/${instrumentId}/`;
        const webSource = await fetch(url).then(res => res.text()).catch(err => {
            console.error(`Error fetching market price for ${instrumentId}:`, err);
            return null;
        });

        if (webSource) {
            const re = /data-testid="qsp-price">(.+?)<\/span>/;
            const match = webSource.match(re);
            if (match && match[1]) {
                console.debug(`Market price found for ${instrumentId}: ${match[1]}`);
                return parseFloat(match[1].trim());
            }
            console.error(`Market price not found in web source for ${instrumentId}`);
        } else {
            console.error(`Failed to read web source for ${instrumentId}`);
        }
    }

    return price;
}