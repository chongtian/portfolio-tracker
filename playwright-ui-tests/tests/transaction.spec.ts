import { test, expect } from '@playwright/test';
import { AccountDetailPage, AccountEditPage, TransactionCreatePage } from '@ui-test/pages';
import { AdminAuthDataFilePath } from '@ui-test/utils'
import { getDataByRoute } from '@ui-test/utils/mockApiHelper';

// test.describe.configure({ mode: 'parallel' });
test.use({ storageState: AdminAuthDataFilePath });

test.describe('Transaction', () => {

    test.beforeEach(async ({ page }) => {
        await page.route('*/**/portfolio/accounts', async route => {
            const json = getDataByRoute('*/**/portfolio/accounts');
            await route.fulfill({ json });
        });
    });

    test('Create Stock transaction', async ({ page }) => {
        const dummyTxnId = "01KREF99G7Y3JT3GY1FKDCDWJS";

        await page.route('*/**/portfolio/transaction', async route => {

            const request = route.request();
            const payload = request.postDataJSON();

            expect(request.method()).toBe('POST');
            expect(payload.txnId).toBe(dummyTxnId);
            expect(payload.txnDate).toBe("2026-05-08");
            expect(payload.accountId).toBe("01KQWTE9M761E2HQ9A2FZ7F155");
            expect(payload.quantity).toBe(100);
            expect(payload.price).toBe(380);
            expect(payload.amount).toBe(38000);
            expect(payload.fees).toBe(0);
            expect(payload.currency).toBe("USD");
            expect(payload.note).toBe("Test");
            expect(payload.instrumentId).toBe("GOOG");
            expect(payload.splitRatio).toBe(1);
            expect(payload.cashCollateral).toBe(0);
            expect(payload.assetType).toBe("STOCK");
            expect(payload.transactionType).toBe("BUY");

            // mock the real API behavior
            payload.entityType = "TXN";
            payload.userId = "obslMFAhcGRLmcGFIHtC4A";
            payload.createdAt = (new Date()).toISOString();
            payload.PK = "USER#obslMFAhcGRLmcGFIHtC4A";
            payload.SK = `TXN#2026-05-08ACCOUNT#01KQWTE9M761E2HQ9A2FZ7F155#${dummyTxnId}`;
            await route.fulfill({ json: payload });
        });

        const createPage = new TransactionCreatePage(page);
        await createPage.goto();

        await expect(createPage.getselectTransactionTypeOptions()).toHaveCount(4);
        expect(await createPage.getselectTransactionTypeOptions().allTextContents()).toEqual(['BUY', 'SELL', 'DIVIDEND', 'SPLIT']);

        await createPage.selectTransactionType('BUY');
        await createPage.selectAccount('Vanguard Broker');
        await createPage.clickContinueButton();

        await createPage.enterTransactionId(dummyTxnId);
        await createPage.enterTransactionDate('2026-05-08');
        await createPage.enterInstrumentId('GOOG');
        await createPage.enterQuantity('100');
        await createPage.enterPrice('380');
        await createPage.enterNote('Test');
        await createPage.clickContinueButton();

        await createPage.clickSubmitButton();
        await expect(page).toHaveURL(/transactions\/TXN%232026-05-08ACCOUNT%2301KQWTE9M761E2HQ9A2FZ7F155%23/);

    });

    test('Create Stock Split transaction', async ({ page }) => {
        const dummyTxnId = "01KREF99G7Y3JT3GY1FKDCDWJS";

        await page.route('*/**/portfolio/transaction', async route => {

            const request = route.request();
            const payload = request.postDataJSON();

            expect(request.method()).toBe('POST');
            expect(payload.txnId).toBe(dummyTxnId);
            expect(payload.txnDate).toBe("2026-04-06");
            expect(payload.accountId).toBe("01KQWTE9M761E2HQ9A2FZ7F155");
            expect(payload.quantity).toBe(0);
            expect(payload.price).toBe(0);
            expect(payload.amount).toBe(0);
            expect(payload.fees).toBe(0);
            expect(payload.currency).toBe("USD");
            expect(payload.note).toBe("Test");
            expect(payload.instrumentId).toBe("VUG");
            expect(payload.splitRatio).toBe("5");
            expect(payload.cashCollateral).toBe(0);
            expect(payload.assetType).toBe("STOCK");
            expect(payload.transactionType).toBe("SPLIT");

            // mock the real API behavior
            payload.entityType = "TXN";
            payload.userId = "obslMFAhcGRLmcGFIHtC4A";
            payload.createdAt = (new Date()).toISOString();
            payload.PK = "USER#obslMFAhcGRLmcGFIHtC4A";
            payload.SK = `TXN#2026-04-06ACCOUNT#01KQWTE9M761E2HQ9A2FZ7F155#${dummyTxnId}`;
            await route.fulfill({ json: payload });
        });

        const createPage = new TransactionCreatePage(page);
        await createPage.goto();

        await createPage.selectAssetType('STOCK');
        await expect(createPage.getselectTransactionTypeOptions()).toHaveCount(4);
        expect(await createPage.getselectTransactionTypeOptions().allTextContents()).toEqual(['BUY', 'SELL', 'DIVIDEND', 'SPLIT']);

        await createPage.selectTransactionType('SPLIT');
        await createPage.selectAccount('Vanguard Broker');
        await createPage.clickContinueButton();

        await createPage.enterTransactionId(dummyTxnId);
        await createPage.enterTransactionDate('2026-04-06');
        await createPage.enterInstrumentId('VUG');
        await createPage.enterSplitRatio('5');
        await createPage.enterNote('Test');
        await createPage.clickContinueButton();

        await createPage.clickSubmitButton();
        await expect(page).toHaveURL(/transactions\/TXN%232026-04-06ACCOUNT%2301KQWTE9M761E2HQ9A2FZ7F155%23/);

    });

    test('Create Option transaction', async ({ page }) => {
        const dummyTxnId = "01KREF99G7Y3JT3GY1FKDCDWJS";

        await page.route('*/**/portfolio/transaction', async route => {

            const request = route.request();
            const payload = request.postDataJSON();

            expect(request.method()).toBe('POST');
            expect(payload.txnId).toBe(dummyTxnId);
            expect(payload.txnDate).toBe("2026-05-08");
            expect(payload.accountId).toBe("01KQWTE9M761E2HQ9A2FZ7F155");
            expect(payload.quantity).toBe(2);
            expect(payload.price).toBe(2.05);
            expect(payload.amount).toBe(4.10);
            expect(payload.fees).toBe(1);
            expect(payload.currency).toBe("USD");
            expect(payload.note).toBe("Test");
            expect(payload.instrumentId).toBe("GOOG260520P00375000");
            expect(payload.splitRatio).toBe(1);
            expect(payload.cashCollateral).toBe(75000);
            expect(payload.assetType).toBe("OPTION");
            expect(payload.transactionType).toBe("SELL");

            // mock the real API behavior
            payload.entityType = "TXN";
            payload.userId = "obslMFAhcGRLmcGFIHtC4A";
            payload.createdAt = (new Date()).toISOString();
            payload.PK = "USER#obslMFAhcGRLmcGFIHtC4A";
            payload.SK = `TXN#2026-05-08ACCOUNT#01KQWTE9M761E2HQ9A2FZ7F155#${dummyTxnId}`;
            await route.fulfill({ json: payload });
        });

        const createPage = new TransactionCreatePage(page);
        await createPage.goto();

        await createPage.selectAssetType('OPTION');
        await expect(createPage.getselectTransactionTypeOptions()).toHaveCount(2);
        expect(await createPage.getselectTransactionTypeOptions().allTextContents()).toEqual(['BUY', 'SELL']);

        await createPage.selectTransactionType('SELL');
        await createPage.selectAccount('Vanguard Broker');
        await createPage.clickContinueButton();

        await createPage.enterTransactionId(dummyTxnId);
        await createPage.enterTransactionDate('2026-05-08');
        await createPage.enterOptionUnderlying('GOOG');
        await createPage.enterOptionExpiration('2026-05-20');
        await createPage.enterOptionType('Put');
        await createPage.enterOptionStrike('375');
        await createPage.enterQuantity('2');
        await createPage.enterPrice('2.05');
        await createPage.enterFee('1');
        await createPage.enterNote('Test');
        await createPage.clickContinueButton();

        await createPage.clickSubmitButton();
        await expect(page).toHaveURL(/transactions\/TXN%232026-05-08ACCOUNT%2301KQWTE9M761E2HQ9A2FZ7F155%23/);

    });

    test('Create Cash transaction', async ({ page }) => {
        const dummyTxnId = "01KREF99G7Y3JT3GY1FKDCDWJS";

        await page.route('*/**/portfolio/transaction', async route => {

            const request = route.request();
            const payload = request.postDataJSON();

            expect(request.method()).toBe('POST');
            expect(payload.txnId).toBe(dummyTxnId);
            expect(payload.txnDate).toBe("2026-05-08");
            expect(payload.accountId).toBe("01KQWTE9M761E2HQ9A2FZ7F155");
            expect(payload.quantity).toBe(1);
            expect(payload.price).toBe(50000);
            expect(payload.amount).toBe(50000);
            expect(payload.fees).toBe(0);
            expect(payload.currency).toBe("USD");
            expect(payload.note).toBe("Test");
            expect(payload.instrumentId).toBe("_CASH");
            expect(payload.splitRatio).toBe(1);
            expect(payload.cashCollateral).toBe(0);
            expect(payload.assetType).toBe("CASH");
            expect(payload.transactionType).toBe("DEPOSIT");

            // mock the real API behavior
            payload.entityType = "TXN";
            payload.userId = "obslMFAhcGRLmcGFIHtC4A";
            payload.createdAt = (new Date()).toISOString();
            payload.PK = "USER#obslMFAhcGRLmcGFIHtC4A";
            payload.SK = `TXN#2026-05-08ACCOUNT#01KQWTE9M761E2HQ9A2FZ7F155#${dummyTxnId}`;
            await route.fulfill({ json: payload });
        });

        const createPage = new TransactionCreatePage(page);
        await createPage.goto();

        await createPage.selectAssetType('CASH');
        await expect(createPage.getselectTransactionTypeOptions()).toHaveCount(4);
        expect(await createPage.getselectTransactionTypeOptions().allTextContents()).toEqual(['INTEREST', 'DEPOSIT', 'WITHDRAW', 'ADJUST']);

        await createPage.selectTransactionType('DEPOSIT');
        await createPage.selectAccount('Vanguard Broker');
        await createPage.clickContinueButton();

        await createPage.enterTransactionId(dummyTxnId);
        await createPage.enterTransactionDate('2026-05-08');
        await createPage.enterQuantity('1');
        await createPage.enterPrice('50000');
        await createPage.enterNote('Test');
        await createPage.clickContinueButton();

        await createPage.clickSubmitButton();
        await expect(page).toHaveURL(/transactions\/TXN%232026-05-08ACCOUNT%2301KQWTE9M761E2HQ9A2FZ7F155%23/);

    });

});