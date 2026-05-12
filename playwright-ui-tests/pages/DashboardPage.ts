import { Page, Locator } from "@playwright/test";
import { BASE_URL } from "@ui-test/utils";

export class DashboardPage {

    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async goto() {
        await this.page.goto(`${BASE_URL}/dashboard`);
    }

    async clickCreateTransactionButton() {
        const button = this.page.getByRole('link', { name: 'Create Transaction' });
        await button.click();
    }

    getTotalCash() {
        const card = this.page.locator('.summary-card', {
            has: this.page.getByRole('heading', { name: 'Total cash' })
        });
        return card.locator('.summary-value');
    }

    getPortfolioValue() {
        const card = this.page.locator('.summary-card', {
            has: this.page.getByRole('heading', { name: 'Portfolio value' })
        });
        return card.locator('.summary-value');
    }

    // index is 1-based
    getAccountName(index: number) {
        const card = this.getAccountCard(index);
        return card.locator('.card-header h3');
    }

    // index is 1-based
    getAccountType(index: number) {
        const card = this.getAccountCard(index);
        return card.locator('.card-header span.tag');
    }

    // index is 1-based
    getAccountBroker(index: number) {
        const card = this.getAccountCard(index);
        return card.locator('p');
    }

    // index is 1-based
    getAcountCashBalance(index: number) {
        const card = this.getAccountCard(index);
        return card.locator('div', { hasText: 'Cash balance' }).locator('dd');
    }

    // index is 1-based
    getAccountTotalValue(index: number) {
        const card = this.getAccountCard(index);
        return card.locator('div', { hasText: 'Total value' }).locator('dd');
    }

    // index is 1-based
    getAccountDetailLink(index: number) {
        const card = this.getAccountCard(index);
        return card.getByRole('link', { name: 'View details' });
    }

    private getAccountCard(index: number) {
        return this.page.locator(`section.cards-grid article.account-card:nth-child(${index})`);
    }


}