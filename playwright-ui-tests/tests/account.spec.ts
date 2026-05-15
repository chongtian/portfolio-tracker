import { test, expect } from '@playwright/test';
import { AccountDetailPage, AccountEditPage } from '@ui-test/pages';
import { AdminAuthDataFilePath } from '@ui-test/utils'
import { getDataByRoute } from '@ui-test/utils/mockApiHelper';

// test.describe.configure({ mode: 'parallel' });
test.use({ storageState: AdminAuthDataFilePath });

test.describe('Account', () => {

    test.beforeEach(async ({ page }) => {
       
        await page.route('*/**/portfolio/account/01KQWTE9M761E2HQ9A2FZ7F155/history/summary?startDate=*&endDate=*&pageSize=*', async route => {
            const json = getDataByRoute('*/**/portfolio/account/01KQWTE9M761E2HQ9A2FZ7F155/history/summary?startDate=*&endDate=*&pageSize=*');
            await route.fulfill({ json });
        });

        await page.route('*/**/portfolio/account/01KQWTE9M761E2HQ9A2FZ7F155/realizedpnl?startDate=*&endDate=*&pageSize=*', async route => {
            const json = getDataByRoute('*/**/portfolio/account/01KQWTE9M761E2HQ9A2FZ7F155/realizedpnl?startDate=*&endDate=*&pageSize=*');
            await route.fulfill({ json });
        });

        await page.route('*/**/portfolio/accounts', async route => {
            const json = getDataByRoute('*/**/portfolio/accounts');
            await route.fulfill({ json });
        });

        await page.route('*/**/portfolio/accounts?summary=true&position=true', async route => {
            const json = getDataByRoute('*/**/portfolio/accounts?summary=true&position=true');
            await route.fulfill({ json });
        });
    });

    test('Verify Account Detail', async ({ page }) => {

        const accountPage = new AccountDetailPage(page);
        await accountPage.goto('01KQWTE9M761E2HQ9A2FZ7F155');

        await expect(accountPage.getAccountDescriptionLine1()).toHaveText('Account detail - Vanguard Broker - TAXABLE');
        await expect(accountPage.getAccountDescriptionLine2()).toHaveText('Broker: Vanguard - Account Number: test-003');
        await expect(accountPage.getCashBalance()).toHaveText('$106,884.02');
        await expect(accountPage.getAvailableCash()).toHaveText('$1,484.02');
        await expect(accountPage.getNetWorth()).toHaveText('$660,763.77');
        await expect(accountPage.getUnrealizedPnL()).toHaveText('$65,912.25');
        await expect(accountPage.getRealizedPnLYTD()).toHaveText('$2,491.00');
        await expect(accountPage.getRealizedPnLOneYear()).toHaveText('$2,491.00');

        await expect(accountPage.getPositionRows()).toHaveCount(6);
        await expect(accountPage.getPositionInstrumentId(1)).toHaveText('NVDA260511P00187500');
        await expect(accountPage.getPositionQuantity(1)).toHaveText('-2');
        await expect(accountPage.getPositionInstrumentId(2)).toHaveText('QQQ260513P00679000');
        await expect(accountPage.getPositionQuantity(2)).toHaveText('-1');
        await expect(accountPage.getPositionInstrumentId(3)).toHaveText('VFH');
        await expect(accountPage.getPositionQuantity(3)).toHaveText('2175');
        await expect(accountPage.getPositionMarketValue(3)).toHaveText('$275,898.75');
        await expect(accountPage.getPositionUnrealizedPnL(3)).toHaveText('$8,821.25');

    });

    test('Click Update Account button', async ({ page }) => {
        const accountPage = new AccountDetailPage(page);
        await accountPage.goto('01KQWTE9M761E2HQ9A2FZ7F155');

        await accountPage.clickUpdateAccountButton();
        await expect(page).toHaveURL(/accounts\/.*\/edit/);
    });

    test('Update Account', async ({ page }) => {

        // intercept API call
        await page.route('*/**/portfolio/account/01KQWHPFQBKS8P8GA8RE01FRX4', async route => {

            const request = route.request();
            const payload = request.postDataJSON();

            expect(request.method()).toBe('PUT');
            expect(request.url()).toContain("01KQWHPFQBKS8P8GA8RE01FRX4");
            expect(payload.active).toBeFalsy();
            expect(payload.baseCurrency).toBe("USD");
            expect(payload.accountType).toBe("IRA");
            expect(payload.accountName).toBe("HSA Updated");
            expect(payload.brokerName).toBe("HSA BANK (P2)");
            expect(payload.accountNumber).toBe("UPD0001");

            // mock the real API behavior
            payload.entityType = "ACCOUNT";
            payload.accountId = "01KQWHPFQBKS8P8GA8RE01FRX4";
            payload.userId = "obslMFAhcGRLmcGFIHtC4A";
            payload.createdAt = (new Date()).toISOString();
            payload.PK = "USER#obslMFAhcGRLmcGFIHtC4A";
            payload.SK = "ACCOUNT#01KQWHPFQBKS8P8GA8RE01FRX4";
            await route.fulfill({ json: payload });
        });

        const accountPage = new AccountEditPage(page);
        await accountPage.goto('01KQWHPFQBKS8P8GA8RE01FRX4');

        await accountPage.enterAccountName('HSA Updated');
        await accountPage.enterBrokerName('HSA BANK (P2)');
        await accountPage.enterAccountNumber('UPD0001');
        await accountPage.selectAccountType('IRA');
        await accountPage.setActiveFlag(false);
        await accountPage.clickSaveChangesButton();
        await expect(page).toHaveURL(/accounts\/01KQWHPFQBKS8P8GA8RE01FRX4$/);
        await accountPage.waitforLoading();

    });

    test('Create Account', async ({ page }) => {

        const dummyAccountId = "abcdefg123456";

        // intercept API call
        await page.route('*/**/portfolio/account', async route => {

            const request = route.request();
            const payload = request.postDataJSON();

            expect(request.method()).toBe('POST');

            expect(payload.active).toBeTruthy();
            expect(payload.baseCurrency).toBe("USD");
            expect(payload.accountType).toBe("401K");
            expect(payload.accountName).toBe("New Test Account");
            expect(payload.brokerName).toBe("Fidelity");
            expect(payload.accountNumber).toBe("1234-5678");

            // mock the real API behavior
            payload.entityType = "ACCOUNT";
            payload.accountId = dummyAccountId;
            payload.userId = "obslMFAhcGRLmcGFIHtC4A";
            payload.createdAt = (new Date()).toISOString();
            payload.PK = "USER#obslMFAhcGRLmcGFIHtC4A";
            payload.SK = `ACCOUNT#${dummyAccountId}`;
            await route.fulfill({ json: payload });
        });

        await page.route('*/**/portfolio/accounts', async route => {
            const mockData = getDataByRoute('*/**/portfolio/accounts');
            const newAccount = {
                "entityType": "ACCOUNT",
                "active": true,
                "baseCurrency": "USD",
                "accountId": dummyAccountId,
                "accountType": "401K",
                "userId": "obslMFAhcGRLmcGFIHtC4A",
                "accountName": "New Test Account",
                "brokerName": "Fidelity",
                "createdAt": (new Date()).toISOString(),
                "PK": "USER#obslMFAhcGRLmcGFIHtC4A",
                "accountNumber": "1234-5678",
                "SK": `ACCOUNT#${dummyAccountId}`
            };
            const json = [...mockData, newAccount];
            await route.fulfill({ json });
        });

        const accountPage = new AccountEditPage(page);
        await accountPage.goto();

        await accountPage.enterAccountName('New Test Account');
        await accountPage.enterBrokerName('Fidelity');
        await accountPage.enterAccountNumber('1234-5678');
        await accountPage.selectAccountType('401K');
        // await accountPage.enterCurrency('USD');
        await accountPage.clickSaveAccountutton();

        await expect(page).toHaveURL(/accounts\/abcdefg123456\/edit/);
        await accountPage.waitforLoading();
        await expect(accountPage.getAccountName()).toHaveValue('New Test Account');
        await expect(accountPage.getBrokerName()).toHaveValue('Fidelity');
        await expect(accountPage.getAccountNumber()).toHaveValue('1234-5678');
        await expect(accountPage.getAccountType()).toHaveValue('401K');
        await expect(accountPage.getActiveFlag()).toBeChecked({ checked: true });

    });

});