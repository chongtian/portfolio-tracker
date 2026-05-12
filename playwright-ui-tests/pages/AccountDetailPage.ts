import { Page } from "@playwright/test";
import { BASE_URL } from "@ui-test/utils";

/**
 * AccountDetailPage is shared by Account Detail and Global Summary
 */
export class AccountDetailPage {

    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Navigate to Account Detail or Global Summary
     * @param id If id is not given, it navigates to Global Summary
     */
    async goto(id?: string) {
        if (id) {
            await this.page.goto(`${BASE_URL}/accounts/${id}`);
        } else {
            await this.page.goto(`${BASE_URL}/globalsummary`);
        }
        await this.waitforLoading();
    }

    async waitforLoading() {
        await this.page.waitForSelector('.page-header');
        await this.page.waitForSelector('text="Loading account data…"', {
            state: 'hidden'
        });
    }

    async clickUpdateAccountButton() {
        const button = this.page.getByRole('link', { name: 'Update account' });
        await button.click();
    }

    getAccountDescriptionLine1() {
        return this.page.locator('.page-header h1');
    }

    getAccountDescriptionLine2() {
        return this.page.locator('.page-header p');
    }

    getCashBalance() {
        const card = this.page.locator('.summary-card', {
            has: this.page.getByRole('heading', { name: 'Cash balance' })
        });
        return card.locator('.summary-value');
    }

    getAvailableCash() {
        const card = this.page.locator('.summary-card', {
            has: this.page.getByRole('heading', { name: 'Available cash' })
        });
        return card.locator('.summary-value');
    }

    getNetWorth() {
        const card = this.page.locator('.summary-card', {
            has: this.page.getByRole('heading', { name: 'Net worth' })
        });
        return card.locator('.summary-value');
    }

    getUnrealizedPnL() {
        const card = this.page.locator('.summary-card', {
            has: this.page.getByRole('heading', { name: 'Unrealized PnL' })
        });
        return card.locator('.summary-value');
    }

    getRealizedPnLYTD() {
        const card = this.page.locator('.summary-card', {
            has: this.page.getByRole('heading', { name: 'Realized PnL YTD' })
        });
        return card.locator('.summary-value');
    }

    getRealizedPnLOneYear() {
        const card = this.page.locator('.summary-card', {
            has: this.page.getByRole('heading', { name: 'Realized PnL in one year' })
        });
        return card.locator('.summary-value');
    }

    getPositionRows() {
        return this.page.locator('section.table-card tbody tr');
    }

    getPositionInstrumentId(index: number) {
        const tr = this.getPositionRow(index);
        return tr.locator('td:nth-child(1)');
    }

    getPositionQuantity(index: number) {
        const tr = this.getPositionRow(index);
        return tr.locator('td:nth-child(2)');
    }

    getPositionMarketValue(index: number) {
        const tr = this.getPositionRow(index);
        return tr.locator('td:nth-child(3)');
    }

    getPositionUnrealizedPnL(index: number) {
        const tr = this.getPositionRow(index);
        return tr.locator('td:nth-child(4)');
    }

    private getPositionRow(index: number) {
        return this.page.locator(`section.table-card tbody tr:nth-child(${index})`);
    }

}