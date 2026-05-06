import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import * as targets from 'aws-cdk-lib/aws-scheduler-targets';
import * as path from 'path';
import { Construct } from 'constructs';
import { Config } from './config';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { functionName, s3bucketName } from '../utils/naming';

interface PortfolioTrackerStackProps extends cdk.StackProps {
  config: Config;
  stage: string;
}

export class PortfolioTrackerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PortfolioTrackerStackProps) {
    super(scope, id, props);

    const { config, stage } = props;
    const tableName = `portfolio_tracker_${stage}`;
    const bucketName = s3bucketName(stage, config.clientBaseUrl);

    // ============================================================================
    // DynamoDB Table
    // ============================================================================

    const table = new dynamodb.Table(this, `PortfolioTable${stage}`, {
      tableName: tableName,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      // stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
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
      entry: path.resolve(__dirname, '../../entries/createTransactionHandler.ts'),
      handler: 'createTransactionHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
        STAGE: stage,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const deleteTransactionFn = new NodejsFunction(this, 'DeleteTransactionHandler', {
      functionName: functionName(stage, 'deleteTransaction'),
      entry: path.resolve(__dirname, '../../entries/deleteTransactionHandler.ts'),
      handler: 'deleteTransactionHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
        STAGE: stage,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const listTransactionsFn = new NodejsFunction(this, 'ListTransactionsHandler', {
      functionName: functionName(stage, 'listTransactions'),
      entry: path.resolve(__dirname, '../../entries/listTransactionsHandler.ts'),
      handler: 'listTransactionsHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
        STAGE: stage,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const listPositionsFn = new NodejsFunction(this, 'ListPositionsHandler', {
      functionName: functionName(stage, 'listPositions'),
      entry: path.resolve(__dirname, '../../entries/listPositionsHandler.ts'),
      handler: 'listPositionsHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
        STAGE: stage,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const listPnlsFn = new NodejsFunction(this, 'ListPnlsHandler', {
      functionName: functionName(stage, 'listPnls'),
      entry: path.resolve(__dirname, '../../entries/listPnlsHandler.ts'),
      handler: 'listPnlsHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
        STAGE: stage,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const saveAccountFn = new NodejsFunction(this, 'SaveAccountHandler', {
      functionName: functionName(stage, 'saveAccount'),
      entry: path.resolve(__dirname, '../../entries/saveAccountHandler.ts'),
      handler: 'saveAccountHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
        STAGE: stage,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const listAccountsFn = new NodejsFunction(this, 'ListAccountsHandler', {
      functionName: functionName(stage, 'listAccounts'),
      entry: path.resolve(__dirname, '../../entries/listAccountsHandler.ts'),
      handler: 'listAccountsHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
        STAGE: stage,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const getSummaryFn = new NodejsFunction(this, 'GetSummaryHandler', {
      functionName: functionName(stage, 'getSummaryHandler'),
      entry: path.resolve(__dirname, '../../entries/getSummaryHandler.ts'),
      handler: 'getSummaryHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
        STAGE: stage,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const summarizePositionFn = new NodejsFunction(this, 'SummarizePositionHandler', {
      functionName: functionName(stage, 'summarizePosition'),
      entry: path.resolve(__dirname, '../../entries/summarizePositionHandler.ts'),
      handler: 'summarizePositionHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
        STAGE: stage,
        MARKETDATA_API_KEY: config.marketDataApiKey
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const getTransactionFn = new NodejsFunction(this, 'GetTransactionHandler', {
      functionName: functionName(stage, 'getTransaction'),
      entry: path.resolve(__dirname, '../../entries/getTransactionHandler.ts'),
      handler: 'getTransactionHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
        STAGE: stage
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const listHistoryFn = new NodejsFunction(this, 'ListHistoryHandler', {
      functionName: functionName(stage, 'listHistory'),
      entry: path.resolve(__dirname, '../../entries/listHistoryHandler.ts'),
      handler: 'listHistoryHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: tableName,
        STAGE: stage,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // const streamProcessor = new NodejsFunction(this, 'StreamProcessor', {
    //   functionName: functionName(stage, 'streamProcessor'),
    //   entry: path.resolve(__dirname, '../../entries/streamProcessor.ts'),
    //   handler: 'streamProcessor',
    //   runtime: lambda.Runtime.NODEJS_24_X,
    //   role: lambdaRole,
    //   environment: {
    //     TABLE_NAME: tableName,
    //     STAGE: stage,
    //   },
    //   timeout: cdk.Duration.seconds(30),
    //   memorySize: 256,
    // });

    // ============================================================================
    // Add DynamoDB stream as event source for Lambda
    // ============================================================================
    // const tableWithStream = dynamodb.Table.fromTableAttributes(this, 'TableWithStream', {
    //   tableArn: table.tableArn,
    //   tableStreamArn: table.tableStreamArn!, // ← non-null assertion
    // });

    // streamProcessor.addEventSource(
    //   new lambdaEventSources.DynamoEventSource(tableWithStream, {
    //     startingPosition: lambda.StartingPosition.LATEST,
    //     batchSize: 100,
    //     retryAttempts: 3,
    //   })
    // );

    // ============================================================================
    // HTTP API Gateway
    // ============================================================================
    const api = new apigatewayv2.HttpApi(this, 'PortfolioApi', {
      apiName: 'portfolio-api',
      description: `Portfolio Tracker HTTP API Stage: ${stage}`,
      createDefaultStage: false,
      corsPreflight: {
        allowOrigins: [stage === 'prod' ? `http://${bucketName}` : '*'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.OPTIONS,
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.PATCH,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
      }
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

    const listPositionsIntegration = new integrations.HttpLambdaIntegration(
      'ListPositionsIntegration',
      listPositionsFn
    );

    const listPnlsIntegration = new integrations.HttpLambdaIntegration(
      'ListPnlsIntegration',
      listPnlsFn
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

    const getTransactionIntegration = new integrations.HttpLambdaIntegration(
      'GetTransactionIntegration',
      getTransactionFn
    );

    const summarizePositionIntegration = new integrations.HttpLambdaIntegration(
      'SummarizePositionIntegration',
      summarizePositionFn
    );

    const listHistoryIntegration = new integrations.HttpLambdaIntegration(
      'ListHistoryIntegration',
      listHistoryFn
    );

    api.addRoutes({
      path: '/portfolio/transaction',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: createTransactionIntegration,
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/portfolio/transaction/{sk}',
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
      path: '/portfolio/account/{accountId}/positions',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: listPositionsIntegration,
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/portfolio/account/{accountId}/realizedpnl',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: listPnlsIntegration,
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/portfolio/account',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: saveAccountIntegration,
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/portfolio/account/{accountId}',
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
      path: '/portfolio/transaction/{sk}',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: getTransactionIntegration,
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/portfolio/summarize-position',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: summarizePositionIntegration,
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/portfolio/account/{accountId}/history/{entity}',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: listHistoryIntegration,
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
    // EventBridge Rules
    // ============================================================================
    const schedule = new scheduler.Schedule(this, 'DailySchedule', {
      schedule: scheduler.ScheduleExpression.cron({
        minute: '30',
        hour: '16',
        weekDay: 'MON-FRI',
      }),
      timeZone: 'America/Chicago', // not working
      target: new targets.LambdaInvoke(summarizePositionFn, {
        input: scheduler.ScheduleTargetInput.fromObject({
          action: 'summarize_positions',
        }),
      }),
    } as scheduler.ScheduleProps);

    // Force timezone into CloudFormation
    const cfn = schedule.node.defaultChild as scheduler.CfnSchedule;
    cfn.addPropertyOverride('ScheduleExpressionTimezone', 'America/Chicago');



    // ============================================================================
    // Client Deployment (S3)
    // ============================================================================

    const siteBucket = new s3.Bucket(this, 'ClientBucket', {
      bucketName: bucketName,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      // publicReadAccess: true,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // keep data
    });

    siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'PublicReadGetObject',
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:GetObject'],
        resources: [`${siteBucket.bucketArn}/*`],
      })
    );

    new s3Deployment.BucketDeployment(this, 'ClientDeployment', {
      sources: [
        s3Deployment.Source.asset('../client/dist',
          {
            exclude: ["config.json"],
          }
        ),
        s3Deployment.Source.data('config.json', JSON.stringify(
          {
            apiEndpoint: `${stagedApi.url}/portfolio`, appStage: stage.toUpperCase()
          }
        )),
      ],
      destinationBucket: siteBucket,
    });

    new cdk.CfnOutput(this, 'ClientBucketName', {
      value: siteBucket.bucketName,
      description: 'S3 bucket for client static files',
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

    new cdk.CfnOutput(this, 'ListPnlsFunctionName', {
      value: listPnlsFn.functionName,
      description: 'List Pnls Lambda function name',
    });

    new cdk.CfnOutput(this, 'SaveAccountFunctionName', {
      value: saveAccountFn.functionName,
      description: 'Save Account Lambda function name',
    });

    new cdk.CfnOutput(this, 'ListAccountsFunctionName', {
      value: listAccountsFn.functionName,
      description: 'List Accounts Lambda function name',
    });

    new cdk.CfnOutput(this, 'GetSummaryFunctionName', {
      value: getSummaryFn.functionName,
      description: 'Get Summary Lambda function name',
    });

    new cdk.CfnOutput(this, 'GetTransactionFunctionName', {
      value: getTransactionFn.functionName,
      description: 'Get Transaction Lambda function name',
    });

    new cdk.CfnOutput(this, 'ListPositionsFunctionName', {
      value: listPositionsFn.functionName,
      description: 'List Positions Lambda function name',
    });

    new cdk.CfnOutput(this, 'SummarizePositionFunctionName', {
      value: summarizePositionFn.functionName,
      description: 'Summarize Position Lambda function name',
    });

    new cdk.CfnOutput(this, 'ListHistoryFunctionName', {
      value: listHistoryFn.functionName,
      description: 'List History Lambda function name',
    });

    new cdk.CfnOutput(this, 'DailyScheduleName', {
      value: schedule.scheduleArn,
    });

  }
}
