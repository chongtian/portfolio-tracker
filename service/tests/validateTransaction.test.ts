import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { validateTransaction } from '@shared/business/validateTransaction';
import { TransactionInput } from '@shared/models/transaction';

describe('validationTransaction', () => {

    test('Verify required field', () => {
        const input = {
            accountId: '',
            transactionType: 'BUY',
            assetType: 'STOCK',
            txnId: '',
            txnDate: '',
            instrumentId: 'GOOG'
        };

        const result = validateTransaction(input as TransactionInput);
        expect(result.success).toBeFalsy();
    });

    test('instrumentId is required for non-cash txn', () => {
        const input = {
            accountId: '001',
            transactionType: 'BUY',
            assetType: 'STOCK',
            txnId: '12345',
            txnDate: '2026-06-19',
            quantity: 100,
            price: 300
        };

        const result = validateTransaction(input as TransactionInput);
        expect(result.success).toBeFalsy();
    });

    test('Validate assetType', () => {
        const input = {
            accountId: '001',
            transactionType: 'BUY',
            assetType: 'NONE',
            txnId: '12345',
            txnDate: '2026-06-19',
            instrumentId: 'GOOG',
            quantity: 100,
            price: 300
        };

        const result = validateTransaction(input as TransactionInput);
        expect(result.success).toBeFalsy();
    });

    test('Validate transaction type', () => {
        const input = {
            accountId: '001',
            transactionType: 'NONE',
            assetType: 'STOCK',
            txnId: '12345',
            txnDate: '2026-06-19',
            instrumentId: 'GOOG',
            quantity: 100,
            price: 300
        };

        const result = validateTransaction(input as TransactionInput);
        expect(result.success).toBeFalsy();
    })

    test('cash transaction has instrument id _CASH', () => {
        const input = {
            accountId: '001',
            transactionType: 'ADJUST',
            assetType: 'CASH',
            txnId: '12345',
            txnDate: '2026-06-19',
            quantity: 1,
            price: 10000
        };

        const result = validateTransaction(input as TransactionInput);
        expect(result.success).toBeTruthy();
        expect((input as TransactionInput).instrumentId).toBe('_CASH');
    })

    test('CALL options have no cash collateral', () => {
        const input = {
            accountId: '001',
            transactionType: 'SELL',
            assetType: 'OPTION',
            txnId: '12345',
            txnDate: '2026-06-19',
            instrumentId: 'GOOG260501C00500000',
            quantity: 1,
            price: 10,
            cashCollateral: 1000
        };

        const result = validateTransaction(input as TransactionInput);
        expect(result.success).toBeTruthy();
        expect((input as TransactionInput).cashCollateral).toBe(0);
    })

    test('amount is automatically calculated', () => {
        const input = {
            accountId: '001',
            transactionType: 'BUY',
            assetType: 'STOCK',
            txnId: '12345',
            txnDate: '2026-06-19',
            instrumentId: 'GOOG',
            quantity: 100,
            price: 375.75,
        };

        const result = validateTransaction(input as TransactionInput);
        expect(result.success).toBeTruthy();
        expect((input as TransactionInput).amount).toBe(37575);
    })    

});