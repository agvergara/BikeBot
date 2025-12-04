/**
 * Local test script for the Lambda handler
 * Run with: npx ts-node test-local.ts
 * 
 * Make sure to set environment variables:
 * - DYNAMODB_TABLE_NAME
 * - TELEGRAM_BOT_TOKEN (optional)
 * - TELEGRAM_CHAT_ID (optional)
 */

import { handler } from './src/index';

// Mock event and context
const event = {
  source: 'local-test',
};

const context = {
  awsRequestId: 'test-request-id',
  functionName: 'test-function',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
  memoryLimitInMB: '512',
  getRemainingTimeInMillis: () => 300000,
} as any;

// Run the handler
handler(event, context, (error, result) => {
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  } else {
    console.log('Success:', result);
    process.exit(0);
  }
});

