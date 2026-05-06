import { BaseInput } from "./baseModel";

export interface TransactionInput extends BaseInput {
  txnId: string;
  txnDate: string;
  accountId: string;
  instrumentId: string;
  assetType: AssetType;
  transactionType: TransactionType;
  quantity?: number;
  price?: number;
  fees?: number;
  amount?: number;
  currency: string;
  splitRatio?: number | null;
  cashCollateral?: number;
  note?: string;
}

export interface TransactionEntity extends TransactionInput {
  PK: string;
  SK: string;
  createdAt: string;
  entityType: string;
}

export enum AssetType {
  STOCK = "STOCK",
  OPTION = "OPTION",
  CASH = "CASH",
}

export enum TransactionType {
  BUY = "BUY",
  SELL = "SELL",
  DIVIDEND = "DIVIDEND",
  INTEREST = "INTEREST",
  EXPIRATION = "EXPIRATION",
  // ASSIGNMENT = "ASSIGNMENT",
  // EXERCISE = "EXERCISE",
  SPLIT = "SPLIT",
  DEPOSIT = "DEPOSIT",
  WITHDRAW = "WITHDRAW",
  ADJUST = "ADJUST",
}

export const OptionMultipler = 100; 