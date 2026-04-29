import { AssetType, TransactionInput, TransactionType } from "@shared/models/transaction";

export const invalidTransactionType = (input: TransactionInput): string | null => {
    const { transactionType, assetType } = input;

    if (!([AssetType.STOCK, AssetType.ETF, AssetType.OPTION, AssetType.CASH].includes(assetType))) {
        return `Invalid asset type ${assetType}`;
    }

    if (assetType === AssetType.STOCK || assetType === AssetType.ETF) {
        if (!([TransactionType.BUY, TransactionType.SELL, TransactionType.DIVIDEND, TransactionType.SPLIT].includes(transactionType))) {
            return `Invalid transaction type ${transactionType} for asset type ${assetType}`;
        }
    }

    if (assetType === AssetType.OPTION) {
        if (!([TransactionType.BUY, TransactionType.SELL, TransactionType.EXPIRATION, TransactionType.ASSIGNMENT, TransactionType.EXERCISE].includes(transactionType))) {
            return `Invalid transaction type ${transactionType} for asset type ${assetType}`;
        }
    }

    if (assetType === AssetType.CASH) {
        if (!([TransactionType.DEPOSIT, TransactionType.WITHDRAW, TransactionType.ADJUST, TransactionType.INTEREST].includes(transactionType))) {
            return `Invalid transaction type ${transactionType} for asset type ${assetType}`;
        }
    }

    return null;
}