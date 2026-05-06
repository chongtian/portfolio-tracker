import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
// Look for .env in the current working directory or the infra directory
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

export interface Config {
  cognitoIssuerUrl: string;
  cognitoClientId: string;
  lambdaRoleArn: string;
  marketDataApiKey: string;
  clientBaseUrl: string;
}

/**
 * Loads and validates configuration from environment variables.
 * @returns Configuration object with all required values
 * @throws Error if any required environment variable is missing
 */
export function loadConfig(): Config {
  const cognitoIssuerUrl = process.env.COGNITO_ISSUER_URL;
  const cognitoClientId = process.env.COGNITO_CLIENT_ID;
  const lambdaRoleArn = process.env.LAMBDA_ROLE_ARN;
  const marketDataApiKey = process.env.MARKETDATA_API_KEY;
  const clientBaseUrl = process.env.CLIENT_BASE_URL;

  const missingVars = [];
  if (!cognitoIssuerUrl) missingVars.push('COGNITO_ISSUER_URL');
  if (!cognitoClientId) missingVars.push('COGNITO_CLIENT_ID');
  if (!lambdaRoleArn) missingVars.push('LAMBDA_ROLE_ARN');
  if (!marketDataApiKey) missingVars.push('MARKETDATA_API_KEY');
  if (!clientBaseUrl) missingVars.push('CLIENT_BASE_URL');

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
      `Please create a .env file in the infra directory with these values. ` +
      `See .env.example for a template.`
    );
  }

  return {
    cognitoIssuerUrl: cognitoIssuerUrl!,
    cognitoClientId: cognitoClientId!,
    lambdaRoleArn: lambdaRoleArn!,
    marketDataApiKey: marketDataApiKey!,
    clientBaseUrl: clientBaseUrl!,
  };
}
