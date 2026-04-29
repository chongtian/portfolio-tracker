export interface LotEntity {
    PK: string;
    SK: string;
    createdAt: string;
    entityType: string;
    lotId: string;
    userId:string;
    accountId: string;
    instrumentId: string;
    openTransactionSK: string;
    openQuantity: number;
    remainingQuantity: number;
    openPrice: number;
    cost: number;
    cashCollateral?: number;
    realizedPnl?: number;
    feesAllocated?: number;
    lastUpdated: string;
}