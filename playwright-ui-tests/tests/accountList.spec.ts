import { test, expect } from '@playwright/test';
import { AccountListPage } from '@ui-test/pages';
import { AdminAuthDataFilePath } from '@ui-test/utils'
import { getDataByRoute } from '@ui-test/utils/mockApiHelper';

// test.describe.configure({ mode: 'parallel' });
test.use({ storageState: AdminAuthDataFilePath });

test.describe('Account List', () => {

    test.beforeEach(async ({ page }) => {

        await page.route('*/**/portfolio/accounts?summary=true&position=true', async route => {
            const json = getDataByRoute('*/**/portfolio/accounts?summary=true&position=true');
            await route.fulfill({ json });
        });

        await page.route('*/**/portfolio/accounts', async route => {
            const json = getDataByRoute('*/**/portfolio/accounts');
            await route.fulfill({ json });
        });
    });

    test('Verify Account line', async ({ page }) => {

        const accountsPage = new AccountListPage(page);
        await accountsPage.goto();

        const index = 2;
        await expect(accountsPage.getAccountName(index)).toContainText('Robinhood Investing');
        await expect(accountsPage.getAccountType(index)).toContainText('TAXABLE');
        await expect(accountsPage.getAccountBroker(index)).toContainText('Robinhood');
        await expect(accountsPage.getAcountCashBalance(index)).toContainText('$207,637.37');
        await expect(accountsPage.getAccountTotalValue(index)).toContainText('$340,005.37');
        await accountsPage.getAccountDetailLink(index).click();
        await expect(page).toHaveURL(/accounts\/01KQWM6QE218DZ462TXGG8QSHX/);

    });

    test('Click Create Account button', async ({ page }) => {
        const accountsPage = new AccountListPage(page);
        await accountsPage.goto();

        await accountsPage.clickCreateAccountButton();
        await expect(page).toHaveURL(/accounts\/new/);
    });
});