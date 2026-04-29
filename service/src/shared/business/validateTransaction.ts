import { AssetType, TransactionInput, TransactionType } from "@shared/models/transaction";
import { OptionType, parseOptionContract } from "@shared/utils/parseOptionContract";

type ValidateResult = {
    success: boolean;
    error?: string;
}

export const validateTransaction = (input: TransactionInput): ValidateResult => {
    const { transactionType, assetType } = input;

    if (!([AssetType.STOCK, AssetType.OPTION, AssetType.CASH].includes(assetType))) {
        return { success: false, error: `Invalid asset type ${assetType}` };
    }

    if (!([
        TransactionType.BUY,
        TransactionType.SELL,
        TransactionType.DIVIDEND,
        TransactionType.INTEREST,
        TransactionType.EXPIRATION,
        TransactionType.ASSIGNMENT,
        TransactionType.EXERCISE,
        TransactionType.SPLIT,
        TransactionType.DEPOSIT,
        TransactionType.WITHDRAW,
        TransactionType.ADJUST].includes(transactionType))) {
        return { success: false, error: `Invalid transaction type ${transactionType}` };
    }

    if (assetType === AssetType.STOCK) {
        if (!([TransactionType.BUY, TransactionType.SELL, TransactionType.DIVIDEND, TransactionType.SPLIT].includes(transactionType))) {
            return { success: false, error: `Invalid transaction type ${transactionType} for asset type ${assetType}` };
        }
    }

    if (assetType === AssetType.OPTION) {
        if (!([TransactionType.BUY, TransactionType.SELL, TransactionType.EXPIRATION, TransactionType.ASSIGNMENT, TransactionType.EXERCISE].includes(transactionType))) {
            return { success: false, error: `Invalid transaction type ${transactionType} for asset type ${assetType}` };
        }
    }

    if (assetType === AssetType.CASH) {
        if (!([TransactionType.DEPOSIT, TransactionType.WITHDRAW, TransactionType.ADJUST, TransactionType.INTEREST].includes(transactionType))) {
            return { success: false, error: `Invalid transaction type ${transactionType} for asset type ${assetType}` };
        }
    }

    if (!input.currency) {
        input.currency = 'USD'; //default to USD if currency is missing
    }

    if (!input.amount) {
        input.amount = (input.quantity || 0) * (input.price || 0);
    }

    if (transactionType === TransactionType.SPLIT && (!input.splitRatio || input.splitRatio <= 0)) {
        return { success: false, error: `Missing or invalid split ratio for split transaction` };
    }

    if (transactionType !== TransactionType.SPLIT && (!input.quantity || !input.price)) {
        return { success: false, error: `Missing quantity or price for transaction type ${transactionType}` };
    }

    if (assetType === AssetType.OPTION) {
        const optionContract = parseOptionContract(input.instrumentId);
        if (!optionContract) {
            return { success: false, error: `Invalid option contract format for instrument ID ${input.instrumentId}` };
        }

        if (optionContract.optionType === OptionType.CALL) {
            input.cashCollateral = 0; // CALL options have no cash collateral
        }
    }

    return { success: true };
}