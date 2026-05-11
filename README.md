# Portfolio Tracker

A full-stack portfolio tracking application for managing investment accounts, transactions, positions, P&L history, and summaries.

## Features

- User authentication and secure app access
- Create, edit, and view investment accounts
- Add, delete, and search transactions
- View account details with positions and profit/loss summaries
- Generate summaries for investment positions

## Tech Stack

### Client

- Framework: React + TypeScript
- Build tool: Vite
- Styling: Tailwind CSS
- Authentication: AWS Cognito

### Backend / Service

- Runtime: Node.js + TypeScript
- Serverless functions / handlers for core API logic
- AWS DynamoDB for data storage 

### Infrastructure

- AWS CDK for infrastructure as code

## Repository Structure

- `client/` - React front-end application
- `service/` - API service handlers, shared models, utilities, etc.
- `infra/` - AWS CDK infrastructure definitions and deployment config

## Notes
The AWS CDK scripts in `infra/` can deploy nearly all components except for the Cognito setup. Currently, Cognito must be configured manually, and its settings, such as clientId, userPoolId, etc., must also be manually updated in the configuration files within both `client/` and `service/`.

### These repository variables are required to deploy:
- COGNITO_USER_POOL_ID: Cognito User Pool ID
- COGNITO_CLIENT_ID: Cognito Application Client ID
- COGNITO_ISSUER_URL: Cognito Issuer Url
- LAMBDA_ROLE_ARN: AWS IAM Role ID for Lambda functions to access DynamoDB tables   
- MARKETDATA_API_KEY: API Key from marketdata.app
- CLIENT_BASE_URL: this is the url used for the client application 
- CDK_DEFAULT_REGION: this is optional. The default region is `us-east-2`.