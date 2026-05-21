export interface Config {
    cognitoIssuerUrl: string;
    cognitoClientId: string;
    lambdaRoleArn: string;
    marketDataApiKey: string;
    alphaVantageApiKey: string;
    clientBaseUrl: string;
}
/**
 * Loads and validates configuration from environment variables.
 * @returns Configuration object with all required values
 * @throws Error if any required environment variable is missing
 */
export declare function loadConfig(): Config;
//# sourceMappingURL=config.d.ts.map