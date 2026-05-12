import { test, expect } from '@playwright/test';
import { AccountDetailPage, AccountEditPage } from '@ui-test/pages';
import { AdminAuthDataFilePath } from '@ui-test/utils'
import { getDataByRoute } from '@ui-test/utils/mockApiHelper';

// test.describe.configure({ mode: 'parallel' });
test.use({ storageState: AdminAuthDataFilePath });

test.describe('Global Summary', () => {

    test.beforeEach(async ({ page }) => {
       
        await page.route('*/**/portfolio/account/01KQWTE9M761E2HQ9A2FZ7F155/history/summary?startDate=*&endDate=*&pageSize=*', async route => {
            const json = getDataByRoute('*/**/portfolio/account/01KQWTE9M761E2HQ9A2FZ7F155/history/summary?startDate=*&endDate=*&pageSize=*');
            await route.fulfill({ json });
        });

        await page.route('*/**/portfolio/account/01KQWTE9M761E2HQ9A2FZ7F155/history/realizedpnl?startDate=*&endDate=*&pageSize=*', async route => {
            const json = getDataByRoute('*/**/portfolio/account/01KQWTE9M761E2HQ9A2FZ7F155/history/realizedpnl?startDate=*&endDate=*&pageSize=*');
            await route.fulfill({ json });
        });

        await page.route('*/**/portfolio/account/01KQWM6QE218DZ462TXGG8QSHX/history/realizedpnl?startDate=*&endDate=*&pageSize=*', async route => {
            const json = getDataByRoute('*/**/portfolio/account/01KQWM6QE218DZ462TXGG8QSHX/history/realizedpnl?startDate=*&endDate=*&pageSize=*');
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

    test('Verify Global Summary', async ({ page }) => {

        const accountPage = new AccountDetailPage(page);
        await accountPage.goto();

        await expect(accountPage.getCashBalance()).toHaveText('$314,808.73');
        await expect(accountPage.getAvailableCash()).toHaveText('$9,708.73');
        await expect(accountPage.getNetWorth()).toHaveText('$1,074,063.52');
        await expect(accountPage.getUnrealizedPnL()).toHaveText('$137,044.78');
        await expect(accountPage.getRealizedPnLYTD()).toHaveText('-$8,761.62');
        await expect(accountPage.getRealizedPnLOneYear()).toHaveText('-$14,491.62');

        await expect(accountPage.getPositionRows()).toHaveCount(11);
        await expect(accountPage.getPositionInstrumentId(1)).toHaveText('QQQ260508P00659000');
        await expect(accountPage.getPositionQuantity(1)).toHaveText('-2');
        await expect(accountPage.getPositionInstrumentId(2)).toHaveText('NVDA260511P00187500');
        await expect(accountPage.getPositionQuantity(2)).toHaveText('-2');
        await expect(accountPage.getPositionInstrumentId(3)).toHaveText('QQQ260513P00679000');
        await expect(accountPage.getPositionQuantity(3)).toHaveText('-2');        
        await expect(accountPage.getPositionInstrumentId(4)).toHaveText('VFH');
        await expect(accountPage.getPositionQuantity(4)).toHaveText('2175');
        await expect(accountPage.getPositionMarketValue(4)).toHaveText('$275,898.75');
        await expect(accountPage.getPositionUnrealizedPnL(4)).toHaveText('$8,821.25');

    });

});