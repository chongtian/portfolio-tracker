import { OptionMultipler } from "@shared/models/transaction";
import { parseOptionContract } from "./parseOptionContract";

export const getMultipler = (instrumentId: string): number => {
    const optionContract = parseOptionContract(instrumentId);
    if (optionContract) {
        return OptionMultipler;
    } else {
        return 1;
    }
}