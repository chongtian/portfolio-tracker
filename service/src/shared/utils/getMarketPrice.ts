import { MarketPrice } from "@shared/models/marketPrice";
import { getStockFundPriceFromAlphaVantage } from "./alphaVantageApiHelper";
import { parseOptionContract } from "./parseOptionContract";
import { getOptionContractPrice } from "./marketDataApiHelper";

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
        // use Alpha Vantage API to get price for stock, etf, and mutual fund
        // still under testing, unsure if the price data has any delay
        return await getStockFundPriceFromAlphaVantage(instrumentId, alphaVantageApiKey);

    }

}