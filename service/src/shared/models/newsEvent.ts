export interface NewsEventEntity {
    PK: string;
    SK: string;
    createdAt: string;
    entityType: string;
    newsType: NewsType;
    userId: string;
    instrumentId: string;
    endDate: string;
    recordDate?: string;
    paymentDate?: string;
    dividendAmount?: number;
    currentPrice?: number;
}

export enum NewsType {
    DIV = "DIV",
    OPTION = "OPTION"
}

export interface DividendEvent {
    instrumentId: string;
    recordDate?: string;
    paymentDate?: string;
    amount?: number;
    success: boolean;
    source?: string;
    message?: string;
}