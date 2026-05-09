import type { PnLEntity } from "./pnl";
import type { PositionEntity } from "./position";
import type { SummaryEntity } from "./summary";

export interface GlobalDetail {
  summary: SummaryEntity;
  positions: PositionEntity[];
  summaryHistory?: SummaryEntity[];
  pnlHistory?: PnLEntity[];
}

export interface HistoryPoint {
  date: string
  value: number
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

