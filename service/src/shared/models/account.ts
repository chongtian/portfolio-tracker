import { BaseInput } from "./baseModel";

export interface AccountInput extends BaseInput {
  accountId: string;
  accountName: string;
  brokerName?: string;
  accountNumber?: string; // this is the optional actual account number from the broker.
  accountType: AccountType;
  baseCurrency: string;
  active: boolean;
}

export interface AccountEntity extends AccountInput {
  PK: string;
  SK: string;
  createdAt: string;
  entityType: string;
}

export enum AccountType {
  TAXABLE = "TAXABLE",
  IRA = "IRA",
  E401K = "401K",
  HSA = "HSA",
  OTHER = "OTHER",
}

