import { Page } from "@playwright/test";
import { BASE_URL } from "@ui-test/utils";

export class AccountEditPage {

    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async goto(id?: string) {
        if (id) {
            await this.page.goto(`${BASE_URL}/accounts/${id}/edit`);
        } else {
            await this.page.goto(`${BASE_URL}/accounts/new`);
        }
        await this.waitforLoading();
    }

    async waitforLoading() {
        await this.page.waitForSelector('.page-header');
        await this.page.waitForSelector('text="Loading account data…"', {
            state: 'hidden'
        });
    }

    async clickSaveChangesButton(confirmAction = true) {
        if (confirmAction) {
            this.page.once('dialog', dialog => dialog.accept());
        }
        const button = this.page.getByRole('button', { name: 'Save changes' });
        await button.click();
    }

    async clickSaveAccountutton(confirmAction = true) {
        if (confirmAction) {
            this.page.once('dialog', dialog => dialog.accept());
        }
        const button = this.page.getByRole('button', { name: 'Save account' });
        await button.click();
    }

    async enterAccountName(value: string) {
        await this.page.getByRole('textbox', { name: 'Account Name' }).fill(value);
    }

    getAccountName() {
        return this.page.getByRole('textbox', { name: 'Account Name' });
    }

    async enterBrokerName(value: string) {
        await this.page.getByRole('textbox', { name: 'Broker Name' }).fill(value);
    }

    getBrokerName() {
        return this.page.getByRole('textbox', { name: 'Broker Name' });
    }

    async enterAccountNumber(value: string) {
        await this.page.getByRole('textbox', { name: 'Account Number' }).fill(value);
    }

    getAccountNumber() {
        return this.page.getByRole('textbox', { name: 'Account Number' });
    }

    async enterCurrency(value: string) {
        await this.page.getByRole('textbox', { name: 'Currency' }).fill(value);
    }

    getCurrency() {
        return this.page.getByRole('textbox', { name: 'Currency' });
    }

    async selectAccountType(value: string) {
        const dropdown = this.page.getByRole('combobox', { name: 'Account type' });
        await dropdown.selectOption(value);
    }

    getAccountType() {
        return this.page.getByRole('combobox', { name: 'Account type' });
    }

    async setActiveFlag(value: boolean) {
        const checkbox = this.page.getByRole('checkbox', { name: 'Active?' });
        if (value) {
            await checkbox.check();
        } else {
            await checkbox.uncheck();
        }
    }

    getActiveFlag() {
        return this.page.getByRole('checkbox', { name: 'Active?' });
    }

}