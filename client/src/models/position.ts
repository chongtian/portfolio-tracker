export interface PositionEntity {
    PK: string;
    SK: string;
    lastUpdated: string;
    entityType: string;
    userId:string;
    accountId: string;
    instrumentId: string;
    quantity: number;
    totalCost: number;
    marketPrice?: number;
    marketValue?: number;
    unrealizedPnl?: number;
    realizedPnl?: number; // for dividends
}