export interface PnLEntity {
    PK: string;
    SK: string;
    createdAt: string;
    entityType: string;
    userId: string;
    accountId: string;
    instrumentId: string;
    closedLotSK: string;
    closedTxnSK: string;
    closedDate: string;
    quantityClosed: number;
    openPrice: number;
    closePrice: number;
    realizedPnl: number;
    feesAllocated: number;
}