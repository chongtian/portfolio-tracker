import { test as setup } from '@playwright/test';
import { LoginPage } from '@ui-test/pages';
import { AdminAuthDataFilePath, TEST_USER_PASSWORD, TEST_USER_USERNAME } from '@ui-test/utils';

setup('authenticate admin user', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(TEST_USER_USERNAME ?? '', TEST_USER_PASSWORD ?? '', AdminAuthDataFilePath);
});
