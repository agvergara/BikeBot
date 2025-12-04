#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { MundimotoScraperStack } from '../lib/MundimotoScraperStack';

const app = new App();

// Support AWS_ACCOUNT and AWS_REGION environment variables
// Usage: AWS_ACCOUNT=123456789012 AWS_REGION=us-east-1 cdk bootstrap
// Or: AWS_ACCOUNT=123456789012 AWS_REGION=us-east-1 cdk deploy
const account = process.env.AWS_ACCOUNT;
const region = process.env.AWS_REGION || 'us-east-1';

new MundimotoScraperStack(app, 'MundimotoScraperStack', {
  env: account
    ? {
        account,
        region,
      }
    : undefined, // Let CDK auto-detect from AWS credentials if not provided
});

