import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';
import { Construct } from 'constructs';
import { Config } from './config';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { functionName } from '../utils/naming';

interface PortfolioTrackerStackProps extends cdk.StackProps {
  config: Config;
  stage: string;
}

export class PortfolioTrackerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PortfolioTrackerStackProps) {
    super(scope, id, props);

    const { config, stage } = props;
    const tableName = 'portfolio_tracker';

    // ============================================================================
    // DynamoDB Table
    // ============================================================================

    const tableNameWithStage = `${tableName}_${stage}`;
    const table = new dynamodb.Table(this, `PortfolioTable${stage}`, {
      tableName: tableNameWithStage,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Add indexes
    // table.addGlobalSecondaryIndex({
    //   indexName: IndexTransactionByTxnId,
    //   partitionKey: { name: 'txnId', type: dynamodb.AttributeType.STRING },
    //   projectionType: dynamodb.ProjectionType.ALL,
    // });

    // table.addGlobalSecondaryIndex({
    //   indexName: IndexTransactionByTxnDate,
    //   partitionKey: { name: 'entityType', type: dynamodb.AttributeType.STRING },
    //   sortKey: { name: 'txnDate', type: dynamodb.AttributeType.STRING },
    //   projectionType: dynamodb.ProjectionType.ALL,
    // });

    // Add CDK output for table name
    new cdk.CfnOutput(this, `TableName${stage}`, {
      value: table.tableName,
      description: `Portfolio Tracker table for ${stage} suffix`,
    });


    // ============================================================================
    // IAM Role (reference existing role by ARN)
    // ============================================================================
    const lambdaRole = iam.Role.fromRoleArn(
      this,
      'LambdaExecutionRole',
      config.lambdaRoleArn,
      { mutable: true }
    );

    // Grant read/write permissions on the table
    table.grantReadWriteData(lambdaRole);

    // ============================================================================
    // Lambda Functions
    // ============================================================================

    const createTransactionFn = new NodejsFunction(this, 'CreateTransactionHandler', {
      functionName: functionName(stage, 'createTransaction'),
      entry: path.resolve(__dirname, '../../../src/functions/createTransactionHandler.ts'),
      handler: 'createTransactionHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const deleteTransactionFn = new NodejsFunction(this, 'DeleteTransactionHandler', {
      functionName: functionName(stage, 'deleteTransaction'),
      entry: path.resolve(__dirname, '../../../src/functions/deleteTransactionHandler.ts'),
      handler: 'deleteTransactionHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    }); 
    
    const listTransactionsFn = new NodejsFunction(this, 'ListTransactionsHandler', {
      functionName: functionName(stage, 'listTransactions'),
      entry: path.resolve(__dirname, '../../../src/functions/listTransactionsHandler.ts'),
      handler: 'listTransactionsHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });  
    
    const createAccountFn = new NodejsFunction(this, 'CreateAccountHandler', {
      functionName: functionName(stage, 'createAccount'),
      entry: path.resolve(__dirname, '../../../src/functions/createAccountHandler.ts'),
      handler: 'createAccountHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });    

    const saveAccountFn = new NodejsFunction(this, 'SaveAccountHandler', {
      functionName: functionName(stage, 'saveAccount'),
      entry: path.resolve(__dirname, '../../../src/functions/saveAccountHandler.ts'),
      handler: 'saveAccountHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const listAccountsFn = new NodejsFunction(this, 'ListAccountsHandler', {
      functionName: functionName(stage, 'listAccounts'),
      entry: path.resolve(__dirname, '../../../src/functions/listAccountsHandler.ts'),
      handler: 'listAccountsHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const getSummaryFn = new NodejsFunction(this, 'GetSummaryHandler', {
      functionName: functionName(stage, 'getSummary'),
      entry: path.resolve(__dirname, '../../../src/functions/getSummary.ts'),
      handler: 'getSummary',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });    

    const getNetWorthFn = new NodejsFunction(this, 'GetNetWorthHandler', {
      functionName: functionName(stage, 'getNetWorth'),
      entry: path.resolve(__dirname, '../../../src/functions/getNetWorth.ts'),
      handler: 'getNetWorth',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });     

    const streamProcessor = new NodejsFunction(this, 'StreamProcessor', {
      functionName: functionName(stage, 'streamProcessor'),
      entry: path.resolve(__dirname, '../../../src/functions/streamProcessor.ts'),
      handler: 'streamProcessor',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // ============================================================================
    // Add DynamoDB stream as event source for Lambda
    // ============================================================================
    const tableWithStream = dynamodb.Table.fromTableAttributes(this, 'TableWithStream', {
      tableArn: table.tableArn,
      tableStreamArn: table.tableStreamArn!, // ← non-null assertion
    });

    streamProcessor.addEventSource(
      new lambdaEventSources.DynamoEventSource(tableWithStream, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 100,
        retryAttempts: 3,
      })
    );

    // ============================================================================
    // HTTP API Gateway
    // ============================================================================
    const api = new apigatewayv2.HttpApi(this, 'PortfolioApi', {
      apiName: 'portfolio-api',
      description: 'Portfolio Tracker HTTP API',
      createDefaultStage: false,
    });

    const jwtAuthorizer = new authorizers.HttpJwtAuthorizer('JwtAuthorizer', config.cognitoIssuerUrl, {
      authorizerName: 'cognito-jwt-authorizer',
      jwtAudience: [config.cognitoClientId],
    });

    const createTransactionIntegration = new integrations.HttpLambdaIntegration(
      'CreateTransactionIntegration',
      createTransactionFn
    );

    const deleteTransactionIntegration = new integrations.HttpLambdaIntegration(
      'DeleteTransactionIntegration',
      deleteTransactionFn
    );

    const listTransactionsIntegration = new integrations.HttpLambdaIntegration(
      'ListTransactionsIntegration',
      listTransactionsFn
    );

    const createAccountIntegration = new integrations.HttpLambdaIntegration(
      'CreateAccountIntegration',
      createAccountFn
    );

    const saveAccountIntegration = new integrations.HttpLambdaIntegration(
      'SaveAccountIntegration',
      saveAccountFn
    );

    const listAccountsIntegration = new integrations.HttpLambdaIntegration(
      'ListAccountsIntegration',
      listAccountsFn
    );

    const getSummaryIntegration = new integrations.HttpLambdaIntegration(
      'GetSummaryIntegration',
      getSummaryFn
    );

    const getNetWorthIntegration = new integrations.HttpLambdaIntegration(
      'GetNetWorthIntegration',
      getNetWorthFn
    );

    api.addRoutes({
      path: '/portfolio/transaction',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: createTransactionIntegration,
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/portfolio/transaction',
      methods: [apigatewayv2.HttpMethod.DELETE],
      integration: deleteTransactionIntegration,
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/portfolio/transactions',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: listTransactionsIntegration,
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/portfolio/account',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: createAccountIntegration,
      authorizer: jwtAuthorizer,
    });    

    api.addRoutes({
      path: '/portfolio/account',
      methods: [apigatewayv2.HttpMethod.PUT],
      integration: saveAccountIntegration,
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/portfolio/accounts',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: listAccountsIntegration,
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/portfolio/account/{accountId}/summary',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: getSummaryIntegration,
      authorizer: jwtAuthorizer,
    });    

    api.addRoutes({
      path: '/portfolio/net-worth',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: getNetWorthIntegration,
      authorizer: jwtAuthorizer,
    });       

    // ============================================================================
    // API Stages
    // ============================================================================
    const stagedApi = api.addStage(`${stage.charAt(0).toUpperCase() + stage.slice(1)}Stage`, {
      stageName: stage,
      autoDeploy: true,
      description: `${stage.toUpperCase()} stage`,
    });

    // ============================================================================
    // Outputs
    // ============================================================================
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: stagedApi.url,
      description: `Default ${stage.toUpperCase()} API Gateway endpoint URL`,
    });

    new cdk.CfnOutput(this, `${stage.charAt(0).toUpperCase() + stage.slice(1)}Endpoint`, {
      value: stagedApi.url,
      description: `${stage.toUpperCase()} stage endpoint`,
    });

    new cdk.CfnOutput(this, 'CreateTransactionFunctionName', {
      value: createTransactionFn.functionName,
      description: 'Create Transaction Lambda function name',
    });

    new cdk.CfnOutput(this, 'DeleteTransactionFunctionName', {
      value: deleteTransactionFn.functionName,
      description: 'Delete Transaction Lambda function name',
    });

    new cdk.CfnOutput(this, 'ListTransactionsFunctionName', {
      value: listTransactionsFn.functionName,
      description: 'List Transactions Lambda function name',
    });

    new cdk.CfnOutput(this, 'CreateAccountFunctionName', {
      value: createAccountFn.functionName,
      description: 'Create Account Lambda function name',
    });

    new cdk.CfnOutput(this, 'SaveAccountFunctionName', {
      value: saveAccountFn.functionName,
      description: 'Save Account Lambda function name',
    });

    new cdk.CfnOutput(this, 'ListAccountsFunctionName', {
      value: listAccountsFn.functionName,
      description: 'List Accounts Lambda function name',
    });

    new cdk.CfnOutput(this, 'GetNetWorthFunctionName', {
      value: getNetWorthFn.functionName,
      description: 'Get Net Worth Lambda function name',
    });   
    
    new cdk.CfnOutput(this, 'GetSummaryFunctionName', {
      value: getSummaryFn.functionName,
      description: 'Get Summary Lambda function name',
    }); 


  }
}
