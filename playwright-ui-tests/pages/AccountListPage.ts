import { Page } from "@playwright/test";
import { BASE_URL } from "@ui-test/utils";

export class AccountListPage {

    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async goto() {
        await this.page.goto(`${BASE_URL}/accounts`);
    }

    async clickCreateAccountButton() {
        const button = this.page.getByRole('link', { name: 'Create account' });
        await button.click();
    }

    // index is 1-based
    getAccountName(index: number) {
        const tr = this.getAccountLine(index);
        return tr.locator('td', { has: this.page.locator('span', { hasText: 'Name' }) });
    }

    // index is 1-based
    getAccountType(index: number) {
        const tr = this.getAccountLine(index);
        return tr.locator('td', { has: this.page.locator('span', { hasText: 'Type' }) });
    }

    // index is 1-based
    getAccountBroker(index: number) {
        const tr = this.getAccountLine(index);
        return tr.locator('td', { has: this.page.locator('span', { hasText: 'Broker' }) });
    }

    // index is 1-based
    getAcountCashBalance(index: number) {
        const tr = this.getAccountLine(index);
        return tr.locator('td', { has: this.page.locator('span', { hasText: 'Cash' }) });
    }

    // index is 1-based
    getAccountTotalValue(index: number) {
        const tr = this.getAccountLine(index);
        return tr.locator('td', { has: this.page.locator('span', { hasText: 'Total Value' }) });
    }

    // index is 1-based
    getAccountDetailLink(index: number) {
        const tr = this.getAccountLine(index);
        return tr.locator('td', { has: this.page.locator('a.link-button') }).locator('a.link-button');
    }

    private getAccountLine(index: number) {
        return this.page.locator(`tbody tr:nth-child(${index})`);
    }


}