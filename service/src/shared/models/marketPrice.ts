export interface MarketPrice {
    success: boolean;
    instrumentId: string;
    isOption: boolean;
    source?: string;
    price?: number;
    asOfDate?: string | undefined;
    message?: string;
}