import { Page } from "@playwright/test";
import { BASE_URL } from "@ui-test/utils";

export class TransactionCreatePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async goto() {
        await this.page.goto(`${BASE_URL}/transactions/new`);
        await this.waitforLoading();
    }

    async waitforLoading() {
        await this.page.waitForSelector('.page-header');
        await this.page.waitForSelector('text="Loading..."', {
            state: 'hidden'
        });
    }

    async clickContinueButton() {
        await this.page.getByRole('button', { name: 'Continue' }).click();
    }

    async clickBackButton() {
        await this.page.getByRole('button', { name: 'Back' }).click();
    }

    async clickSubmitButton(confirmAction = true) {
        if (confirmAction) {
            this.page.once('dialog', dialog => dialog.accept());
        }
        await this.page.getByRole('button', { name: 'Submit transaction' }).click();
    }

    async selectAssetType(value: string) {
        await this.page.getByRole('combobox', { name: 'Asset type' }).selectOption(value);
    }

    async selectTransactionType(value: string) {
        await this.page.getByRole('combobox', { name: 'Transaction type' }).selectOption(value);
    }

    getselectTransactionTypeOptions() {
        return this.page.getByRole('combobox', { name: 'Transaction type' }).locator('option');
    }

    async selectAccount(value: string) {
        await this.page.getByRole('combobox', { name: 'Account' }).selectOption({ label: value });
    }

    async enterTransactionId(value: string) {
        await this.page.getByRole('textbox', { name: 'Transaction ID' }).fill(value);
    }

    async enterTransactionDate(value: string) {
        await this.page.getByRole('textbox', { name: 'Transaction date' }).fill(value);
    }

    async enterInstrumentId(value: string) {
        await this.page.getByRole('textbox', { name: 'Instrument ID' }).fill(value);
    }

    async enterQuantity(value: string) {
        await this.page.getByRole('spinbutton', { name: 'Quantity' }).fill(value);
    }

    async enterPrice(value: string) {
        await this.page.getByRole('spinbutton', { name: 'Price' }).fill(value);
    }

    async enterFee(value: string) {
        await this.page.getByRole('spinbutton', { name: 'Fee' }).fill(value);
    }

    async enterCurrency(value: string) {
        await this.page.getByRole('textbox', { name: 'Currentcy' }).fill(value);
    }

    async enterNote(value: string) {
        await this.page.getByRole('textbox', { name: 'Note' }).fill(value);
    }

    async enterOptionUnderlying(value: string) {
        await this.page.getByRole('textbox', { name: 'Underlying' }).fill(value);
    }

    async enterOptionExpiration(value: string) {
        await this.page.getByRole('textbox', { name: 'Expiration' }).fill(value);
    }

    async enterOptionType(value: string) {
        await this.page.getByRole('combobox', { name: 'Call / Put' }).selectOption(value);
    }

    async enterOptionStrike(value: string) {
        await this.page.getByRole('spinbutton', { name: 'Strike' }).fill(value);
    }

    async enterSplitRatio(value: string) {
        await this.page.getByRole('textbox', { name: 'Split ratio' }).fill(value);
    }
}