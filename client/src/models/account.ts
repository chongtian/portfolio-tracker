import type { CashEntity } from "./cash";
import type { PnLEntity } from "./pnl";
import type { PositionEntity } from "./position";
import type { SummaryEntity } from "./summary";

export interface AccountEntity {
  PK: string;
  SK: string;
  createdAt: string;
  entityType: string;
  userId?: string;
  accountId: string;
  accountName: string;
  brokerName?: string;
  accountNumber?: string;
  accountType: string;
  baseCurrency: string;
  active: boolean;
}

export interface AccountDetail {
  accountId: string;
  account: AccountEntity;
  summary: SummaryEntity;
  positions: PositionEntity[];
  cashHistory: CashEntity[];
  summaryHistory: SummaryEntity[];
  pnlHistory: PnLEntity[];
}

