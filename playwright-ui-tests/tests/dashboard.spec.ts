import { test, expect } from '@playwright/test';
import { DashboardPage } from '@ui-test/pages';
import { AdminAuthDataFilePath, BASE_URL } from '@ui-test/utils'
import { getDataByRoute } from '@ui-test/utils/mockApiHelper';

// test.describe.configure({ mode: 'parallel' });
test.use({ storageState: AdminAuthDataFilePath });

test.describe('Navigation Bar', () => {

    test('user navigates to Accounts', async ({ page, isMobile }) => {
        await page.goto(BASE_URL!);
        if (isMobile) {
            await page.getByRole('button', { name: 'Toggle navigation' }).click();
        }

        const menu = page.getByRole('link', { name: 'Accounts' });
        await menu.click();
        await expect(page).toHaveURL(/accounts/);
    });

    test('user navigates to Global Summary', async ({ page, isMobile }) => {
        await page.goto(BASE_URL!);
        if (isMobile) {
            await page.getByRole('button', { name: 'Toggle navigation' }).click();
        }

        const menu = page.getByRole('link', { name: 'Global Summary' });
        await menu.click();
        await expect(page).toHaveURL(/globalsummary/);
    });

    test('user navigates to Transactions', async ({ page, isMobile }) => {
        await page.goto(BASE_URL!);
        if (isMobile) {
            await page.getByRole('button', { name: 'Toggle navigation' }).click();
        }

        const menu = page.getByRole('link', { name: 'Transactions' });
        await menu.click();
        await expect(page).toHaveURL(/transactions/);
    });

    test('user navigates to Summarize', async ({ page, isMobile }) => {
        await page.goto(BASE_URL!);
        if (isMobile) {
            await page.getByRole('button', { name: 'Toggle navigation' }).click();
        }

        const menu = page.getByRole('link', { name: 'Summarize' });
        await menu.click();
        await expect(page).toHaveURL(/summarize/);
    });

    test('user navigates to Dashboard', async ({ page, isMobile }) => {
        await page.goto(BASE_URL!);
        if (isMobile) {
            await page.getByRole('button', { name: 'Toggle navigation' }).click();
        }

        const menu = page.getByRole('link', { name: 'Dashboard' });
        await menu.click();
        await expect(page).toHaveURL(/dashboard/);
    });

    test('Click Create Transaction button', async ({ page }) => {
        const dashboardPage = new DashboardPage(page);
        await dashboardPage.goto();

        await dashboardPage.clickCreateTransactionButton();
        await expect(page).toHaveURL(/transactions\/new/);
    });

});


test.describe('Verify Dashboard', () => {

    test.beforeEach(async ({ page }) => {
        await page.route('*/**/portfolio/accounts?summary=true&position=true', async route => {
            const json = getDataByRoute('*/**/portfolio/accounts?summary=true&position=true');
            await route.fulfill({ json });
        });
    });

    test('Verify Summary', async ({ page }) => {

        const dashboardPage = new DashboardPage(page);
        await dashboardPage.goto();

        await expect(dashboardPage.getTotalCash()).toHaveText('$314,808.73');
        await expect(dashboardPage.getPortfolioValue()).toHaveText('$1,074,063.52');

    });

    test('Verify Account card', async ({ page }) => {

        const dashboardPage = new DashboardPage(page);
        await dashboardPage.goto();

        const index = 3;
        await expect(dashboardPage.getAccountName(index)).toHaveText('SEP-IRA');
        await expect(dashboardPage.getAccountType(index)).toHaveText('IRA');
        await expect(dashboardPage.getAccountBroker(index)).toHaveText('Vanguard');
        await expect(dashboardPage.getAcountCashBalance(index)).toHaveText('$287.34');
        await expect(dashboardPage.getAccountTotalValue(index)).toHaveText('$66,954.54');
        await dashboardPage.getAccountDetailLink(index).click();
        expect(page).toHaveURL(/accounts\/01KQWV7PRBK6T6QQE2ZSSCAKDJ/);

    });
});