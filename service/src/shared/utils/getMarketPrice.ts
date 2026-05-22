import { MarketPrice } from "@shared/models/marketPrice";
import { getStockFundPriceFromAlphaVantage } from "./alphaVantageApiHelper";
import { parseOptionContract } from "./parseOptionContract";
import { getFundStockHistoricalPrice, getOptionContractPrice, getStockPrice } from "./marketDataApiHelper";

export const getCurrentMarketPrice = async (instrumentId: string): Promise<MarketPrice> => {

    const marketDataApiKey = process.env.MARKETDATA_API_KEY;
    const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;

    const optionContract = parseOptionContract(instrumentId);
    const isOption = !!optionContract;

    if (isOption) {
        // use Market Data API to get price for option contract
        // the price is 1-day older
        return await getOptionContractPrice(optionContract, marketDataApiKey);

    } else {

        if (instrumentId.length > 4) {
            // this is a mutual fund, use Market Data API to get price for mutual fund
            // the price is 1-day older
            return await getFundStockHistoricalPrice(instrumentId, marketDataApiKey);
        } else {
            // use Market Data API to get realtime price for stock
            return await getStockPrice(instrumentId, marketDataApiKey);
        }

    }

}