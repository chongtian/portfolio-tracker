import * as fs from 'fs';
import { AdminAuthDataFilePath, API_BASE_URL } from '@ui-test/utils';
import { APIRequestContext, request } from '@playwright/test';

export class ApiHelper {

    private context: APIRequestContext;
    private static readonly apiBaseUrl = API_BASE_URL;

    constructor(context: APIRequestContext) {
        this.context = context;
    }

    private static getBearerTokenFromStorageState(): string {
        const storageStatePath = AdminAuthDataFilePath;
        const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
        const localStorage = storageState.origins[0].localStorage as { name: string; value: string }[];

        let accessToken: string = '';
        localStorage.forEach(item => {
            if (item.name.endsWith('.accessToken')) {
                accessToken = item.value;
                return;
            }
        });
        return accessToken;
    }

    /**
    * Static factory method to handle the async creation of the context
    */
    static async create() {
        const newContext = await request.newContext({
            baseURL: this.apiBaseUrl,
            extraHTTPHeaders: {
                'Authorization': `Bearer ${this.getBearerTokenFromStorageState()}`,
                'Accept': 'application/json',
            }
        });

        return new ApiHelper(newContext);
    }

    async dispose() {
        await this.context.dispose();
    }

    async delete(endpoint: string) {
        if (this.context) {
            await this.context.delete(endpoint).then(response => {
                if (!response.ok()) {
                    throw new Error(`API DELETE request to ${endpoint} failed with status ${response.status()}`);
                }
            }).catch(error => {
                console.error(`Error during API DELETE request to ${endpoint}:`, error);
                throw error;
            });
        }
    }

    async put(endpoint: string, payload: any) {
        if (this.context) {
            await this.context.put(endpoint, { data: payload }).then(response => {
                if (!response.ok()) {
                    throw new Error(`API PUT request to ${endpoint} failed with status ${response.status()}`);
                }
            }).catch(error => {
                console.error(`Error during API PUT request to ${endpoint}:`, error);
                throw error;
            });
        }
    }

    async post(endpoint: string, payload: any) {
        if (this.context) {
            await this.context.post(endpoint, { data: payload }).then(response => {
                if (!response.ok()) {
                    throw new Error(`API POST request to ${endpoint} failed with status ${response.status()}`);
                }
            }).catch(error => {
                console.error(`Error during API POST request to ${endpoint}:`, error);
                throw error;
            });
        }
    }

    async get(endpoint: string) {
        // let result: any;

        if (this.context) {
            const res = await this.context.get(endpoint);
            if (!res.ok()) {
                return null;
            }

            return res.json();
        }
        return null;
    }

}