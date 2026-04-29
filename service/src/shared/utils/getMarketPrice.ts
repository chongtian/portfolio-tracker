import { parseOptionContract } from "./parseOptionContract";

export const getCurrentMarketPrice = async (instrumentId: string): Promise<number | null> => {

    if (parseOptionContract(instrumentId)) {
        console.log(`Instrument ${instrumentId} is an option contract, fetching market price has not been implemented...`);
        return null;
    }

    // temporarily using web scraping to get the market price, will replace with a more robust solution in the future
    const url = `https://finance.yahoo.com/quote/${instrumentId}/`;
    const webSource = await fetch(url).then(res => res.text()).catch(err => {
        console.error(`Error fetching market price for ${instrumentId}:`, err);
        return null;
    });

    if (webSource) {
        const re = /data-testid="qsp-price">(.+?)<\/span>/;
        const match = webSource.match(re);
        if (match && match[1]) {
            console.log(`Market price found for ${instrumentId}: ${match[1]}`);
            return parseFloat(match[1].trim());
        }
        console.error(`Market price not found in web source for ${instrumentId}`);
    } else {
        console.error(`Failed to read web source for ${instrumentId}`);
    }

    return null;
}