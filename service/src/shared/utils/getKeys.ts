export const EntityTypeMetadata = "META";
export const EntityTypeUser = "USER";
export const EntityTypeAccount = "ACCOUNT";
export const EntityTypeTransaction = "TXN";
export const EntityTypeCash = "CASH";
export const EntityTypeSummary = "SUMMARY";
export const EntityTypeLot = "LOT";
export const EntityTypePosition = "POS";
export const EntityTypePnL = "PNL";
export const EntityTypeInstrument = "INSTR";
export const ProcessedMark = "PROCESSED";

export const metadataPartitionKey = EntityTypeMetadata;
export const userSortKey = EntityTypeUser;

export const accountPartitionKey = (userId: string) => `${EntityTypeUser}#${userId}`;
export const accountSortKey = (accountId: string) => `${EntityTypeAccount}#${accountId}`;

export const transactionPartitionKey = (userId: string ) => `${EntityTypeUser}#${userId}`;
export const transactionSortKey = (accountId: string, txnDate: string, txnId: string) => `${EntityTypeTransaction}#${txnDate}#${EntityTypeAccount}#${accountId}#${txnId}`;

export const cashPartitionKey = (userId: string, accountId: string) => `${EntityTypeUser}#${userId}#ACCOUNT#${accountId}`;
export const cashSortKey = () => EntityTypeCash;
export const cashHistorySortKey = (asOfDate: string) => `${EntityTypeCash}#${asOfDate}`;

export const summaryPartitionKey = (userId: string, accountId: string) => `${EntityTypeUser}#${userId}#ACCOUNT#${accountId}`;
export const summarySortKey = () => EntityTypeSummary;
export const summaryHistorySortKey = (asOfDate: string) => `${EntityTypeSummary}#${asOfDate}`;

export const lotPartitionKey = (userId: string, accountId: string, instrumentId: string) => `${EntityTypeUser}#${userId}#${EntityTypeAccount}#${accountId}#${EntityTypeInstrument}#${instrumentId}`;
export const lotSortKey = (txnDate: string, lotId: string) => `${EntityTypeLot}#${txnDate}#${lotId}`;

export const positionPartitionKey = (userId: string, accountId: string) => `${EntityTypeUser}#${userId}#${EntityTypeAccount}#${accountId}`;
export const positionSortKey = (instrumentId: string) => `${EntityTypePosition}#${instrumentId}`;
export const positionHistorySortKey = (instrumentId: string, asOfDate: string) => `${EntityTypePosition}#${asOfDate}#${instrumentId}`;

export const pnlPartitionKey = (userId: string, accountId: string) => `${EntityTypeUser}#${userId}#${EntityTypeAccount}#${accountId}`;
export const pnlSortKey = (txnDate: string, instrumentId: string, lotId: string) => `${EntityTypePnL}#${txnDate}#${EntityTypeInstrument}#${instrumentId}#${lotId}`;

export const processedPartitionKey = (eventId: string) => `${ProcessedMark}#${eventId}`;
export const processedSortKey = () =>`${ProcessedMark}`;