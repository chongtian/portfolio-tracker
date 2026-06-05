import type { PnLEntity } from "./pnl";
import type { PositionEntity } from "./position";
import type { SummaryEntity } from "./summary";

export interface GlobalDetail {
  summary: SummaryEntity;
  positions: PositionEntity[];
  summaryHistory?: SummaryEntity[];
  pnlHistory?: PnLEntity[];
}

export interface AccountPayload {
  accountName: string;
  brokerName?: string;
  accountNumber?: string;
  accountType: string;
  baseCurrency: string;
  active: boolean;
}

export interface QueryResult<T> {
  items: T[];
  hasMore: boolean;
  nextToken?: string;
}

export interface EventLog {
  PK: string;
  SK: string;
  createdAt: string;
  event: string;
  logs?: string[];
  source: string;
  isProcessing?: boolean;
}

export interface NewsEventEntity {
    PK: string;
    SK: string;
    createdAt: string;
    entityType: string;
    newsType: string;
    userId: string;
    instrumentId: string;
    endDate: string;
    recordDate?: string;
    paymentDate?: string;
    dividendAmount?: number;
    currentPrice?: number;
}

