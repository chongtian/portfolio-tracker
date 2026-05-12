import { expect, type Locator, type Page } from '@playwright/test';
import { LOGIN_URL } from '@ui-test/utils'

export class LoginPage {

    readonly page: Page;
    readonly usernameField: Locator;
    readonly passwordField: Locator;
    readonly signInButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.usernameField = page.getByRole('textbox', { name: 'Username' });
        this.passwordField = page.getByRole('textbox', { name: 'Password' });
        this.signInButton = page.getByRole('button', { name: 'Sign in' });
    }

    async goto() {
        await this.page.goto(LOGIN_URL);
    }

    async login(username: string, password: string, pathToStorage?: string) {
        if (!username || !password) {
            throw Error('Username and Password are required.');
        }

        await this.usernameField.fill(username);
        await this.passwordField.fill(password);
        await this.signInButton.click();
        await expect(this.page).toHaveURL(/dashboard/);

        if (pathToStorage) {
            await this.page.context().storageState({ path: pathToStorage });
        }

    }
}