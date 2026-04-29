export interface CashEntity {
    PK: string;
    SK: string;
    createdAt: string;
    entityType: string; //CASH
    balance: number;
    availableBalance?: number;
    asOfDate?: string;
    lastUpdated: string;
}