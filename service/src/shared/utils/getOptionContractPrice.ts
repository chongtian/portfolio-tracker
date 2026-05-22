import { MarketPrice } from "@shared/models/marketPrice";
// import { spawn } from "child_process";

interface OptionWatchApiResponse {
    [instrumentId: string]: OptionPriceData;
}

interface OptionPriceData {
    askPrice: number;
    askSize: number;
    askTime: number;
    bidPrice: number;
    bidSize: number;
    bidAskTime: number;
    lastTradePrice: number;
    lastTradeSize: number;
    lastTradeTime: number;
    previousClose: number;
}

// const fetchOptionDataWithCurl = async (instrumentId: string): Promise<string> => {
//     return new Promise((resolve, reject) => {
//         const curl = spawn("curl", [
//             "https://api.optionwatch.io/api/universal_snapshot",
//             "-H", "content-type: application/json",
//             "-H", "origin: https://optionwatch.io",
//             "-H", "referer: https://optionwatch.io/",
//             "-H", "user-agent: Mozilla/5.0",
//             "--data-raw", JSON.stringify({
//                 contracts: [instrumentId]
//             })
//         ]);

//         let output = "";
//         let error = "";

//         curl.stdout.on("data", (data) => {
//             output += data.toString();
//         });

//         curl.stderr.on("data", (data) => {
//             error += data.toString();
//         });

//         curl.on("close", (code) => {
//             if (code === 0) {
//                 resolve(output);
//             } else {
//                 reject(new Error(error));
//             }
//         });
//     });
// }

export const getOptionContractPriceFromOptionWatch = async (instrumentId: string): Promise<MarketPrice> => {

    const result: MarketPrice = {
        success: false,
        instrumentId: instrumentId,
        isOption: true,
        source: "OPTION_WATCH"
    };

    // const raw = await fetchOptionDataWithCurl(instrumentId);
    // try {
    //     const parsed = JSON.parse(raw) as OptionWatchApiResponse;
    //     if (instrumentId in parsed && parsed[instrumentId]?.previousClose) {
    //         result.price = parsed[instrumentId]?.previousClose;
    //         result.asOfDate = (new Date(parsed[instrumentId]?.lastTradeTime)).toISOString();
    //         result.success = true;
    //     } else {
    //         result.success = false;
    //         result.message = `Failed to get market price from api for ${instrumentId}`;
    //     }
    // } catch (error) {
    //     result.success = false;
    //     result.message = `Failed to get market price from api for ${instrumentId}: ${error}`;
    // }

    const res = await fetch("https://api.optionwatch.io/api/universal_snapshot?", {
        "headers": {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "priority": "u=1, i",
            "sec-ch-ua": "\"Chromium\";v=\"148\", \"Google Chrome\";v=\"148\", \"Not/A)Brand\";v=\"99\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "Referer": "https://optionwatch.io/",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
            "origin": "https://optionwatch.io"
        },
        "body": JSON.stringify({ contracts: [instrumentId] }),
        "method": "POST"
    });

    if (res.ok) {
        try {
            const data = (await res.json()) as OptionWatchApiResponse;
            if (instrumentId in data && data[instrumentId]?.previousClose) {
                result.price = data[instrumentId]?.previousClose;
                result.asOfDate = (new Date(data[instrumentId]?.lastTradeTime)).toISOString();
                result.success = true;
            } else {
                result.success = false;
                result.message = `Failed to get market price from api for ${instrumentId}`;
            }
        } catch (error) {
            result.success = false;
            result.message = `Failed to get market price from api for ${instrumentId}: ${error}`;
        }
    } else {
        result.success = false;
        result.message = `Failed to get market price from api for ${instrumentId}`;
    }

    return result;
}