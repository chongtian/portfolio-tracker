export interface TransactionEntity {
  PK: string;
  SK: string;
  createdAt: string;
  entityType: string;
  txnId: string;
  txnDate: string;
  accountId: string;
  instrumentId: string;
  assetType: string;
  transactionType: string;
  quantity?: number;
  price?: number;
  fees?: number;
  amount?: number;
  currency: string;
  splitRatio?: number | null;
  cashCollateral?: number;
  note?: string;
  userId: string;
}

export const OptionMultipler = 100; 