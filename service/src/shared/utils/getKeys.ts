export const EntityTypeUser = "USER";
export const EntityTypeAccount = "ACCOUNT";
export const EntityTypeTransaction = "TXN";
export const EntityTypeCash = "CASH";
export const EntityTypeSummary = "SUMMARY";
export const EntityTypeNetWorth = "NETWORTH";
export const EntityTypeLot = "LOT";
export const EntityTypePosition = "POS";
export const EntityTypePnL = "PNL";
export const EntityTypeInstrument = "INSTR";
export const ProcessedMark = "PROCESSED";

export const accountPartitionKey = (userId: string) => `${EntityTypeUser}#${userId}`;
export const accountSortKey = (accountId: string) => `${EntityTypeAccount}#${accountId}`;

export const transactionPartitionKey = (userId: string ) => `${EntityTypeUser}#${userId}`;
export const transactionSortKey = (accountId: string, txnDate: string, txnId: string) => `${EntityTypeTransaction}#${txnDate}#${EntityTypeAccount}#${accountId}#${txnId}`;

export const cashPartitionKey = (userId: string, accountId: string) => `${EntityTypeUser}#${userId}#ACCOUNT#${accountId}`;
export const cashSortKey = () => EntityTypeCash;
export const cashHistorySortKey = (asOfDate: string) => `${EntityTypeCash}#${asOfDate}`;

export const summaryPartitionKey = (userId: string, accountId: string) => `${EntityTypeUser}#${userId}#ACCOUNT#${accountId}`;
export const summarySortKey = () => EntityTypeSummary;

export const netWorthPartitionKey = (userId: string) => `${EntityTypeUser}#${userId}`;
export const netWorthSortKey = () => EntityTypeNetWorth;

export const lotPartitionKey = (userId: string, accountId: string, instrumentId: string) => `${EntityTypeUser}#${userId}#${EntityTypeAccount}#${accountId}#${EntityTypeInstrument}#${instrumentId}`;
export const lotSortKey = (txnDate: string, lotId: string) => `${EntityTypeLot}#${txnDate}#${lotId}`;

export const positionPartitionKey = (userId: string, accountId: string) => `${EntityTypeUser}#${userId}#${EntityTypeAccount}#${accountId}`;
export const positionSortKey = (instrumentId: string) => `${EntityTypePosition}#${instrumentId}`;

export const pnlPartitionKey = (userId: string, accountId: string, instrumentId: string) => `${EntityTypeUser}#${userId}#${EntityTypeAccount}#${accountId}#${EntityTypeInstrument}#${instrumentId}`;
export const pnlSortKey = (txnDate: string, lotId: string) => `${EntityTypePnL}#${txnDate}#${lotId}`;

export const processedPartitionKey = (userId: string) => `${EntityTypeUser}#${userId}`;
export const processedSortKey = (eventId: string) => `${ProcessedMark}#${eventId}`;