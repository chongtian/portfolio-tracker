#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PortfolioTrackerStack } from '../lib/portfolio-stack';
import { loadConfig } from '../lib/config';

const app = new cdk.App();

// Load configuration
const config = loadConfig();

// Get stage from context or default to 'dev'
const stage = app.node.tryGetContext('stage') ?? 'dev';

const appName = stage === 'prod' ? `PortfolioTrackerStack` : `PortfolioTrackerStack-${stage}`

// Create the main stack
new PortfolioTrackerStack(app, appName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-2',
  },
  config, stage
});

app.synth();
