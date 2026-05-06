export interface OptionContractEntity {
    instrumentId: string;
    underlying: string;
    expirationDate: Date;
    optionType: string;
    strikePrice: number;
}