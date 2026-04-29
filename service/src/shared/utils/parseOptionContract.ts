import { OptionContractEntity } from "@shared/models/optionContract";

export const parseOptionContract = (optionContractStr: string): OptionContractEntity | null => {
    const re = /([A-Z]{3,4})(\d{6})([CP])(\d+)/;
    const m = optionContractStr.match(re);

    if (!m) {
        console.error(`No a valid instrument id for option contract: ${optionContractStr}`);
        return null;
    } else {
        const [full, g1, g2, g3, g4] = m;
        if (!g1 || !g2 || !g3 || !g4) {
            console.error(`No a valid instrument id for option contract: ${optionContractStr}`);
            return null;
        }

        return {
            instrumentId: optionContractStr,
            underlying: g1,
            expirationDate: new Date(`20${g2.slice(0, 2)}-${g2.slice(2, 4)}-${g2.slice(4, 6)}`).toISOString(),
            optionType: g3 === "C" ? OptionType.CALL : OptionType.PUT,
            strikePrice: parseInt(g4, 10) / 1000
        };
    }

}

export enum OptionType {
    CALL = "CALL",
    PUT = "PUT"
}