export interface NetWorthEntity {
    PK: string;
    SK: string;
    createdAt: string;
    entityType: string; //NET_WORTH

    totalCash: number;
    totalAvailableCash?: number;
    totalPositionsValue: number;
    unrealizedPnl: number;
    realizedPnl?: number; // for future extension to support realizedPnl in net worth
    netWorth: number;
    asOfDate?: string; // for future extension to support historical net worth
    lastUpdated: string;

}
