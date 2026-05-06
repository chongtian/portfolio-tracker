export interface SummaryEntity {
    PK: string;
    SK: string;
    createdAt: string;
    entityType: string; //SUMMARY   
    totalCash: number;
    totalAvailableCash?: number;
    totalPositionsValue: number;
    unrealizedPnl: number;
    realizedPnl?: number; // for future extension to support realized PnL in summary
    asOfDate?: string; // for future extension to support historical summary
    lastUpdated: string;
}
