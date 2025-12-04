#!/bin/bash

# Script to view CloudWatch logs for the Mundimoto Scraper Lambda function
# Usage: ./scripts/view-logs.sh [--follow]

set -e

echo "🔍 Finding Lambda function name..."

# Get the function name from CloudFormation stack outputs
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name MundimotoScraperStack \
  --query 'Stacks[0].Outputs[?OutputKey==`MundimotoScraperFunction`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$FUNCTION_NAME" ]; then
  echo "❌ Error: Could not find MundimotoScraperStack or Lambda function"
  echo "   Make sure the stack is deployed and you're in the correct AWS region"
  exit 1
fi

echo "✅ Found function: $FUNCTION_NAME"
echo "📊 Viewing CloudWatch logs..."
echo ""

# View logs (with follow option if provided)
if [ "$1" == "--follow" ]; then
  echo "   (Press Ctrl+C to stop following logs)"
  echo ""
  aws logs tail "/aws/lambda/$FUNCTION_NAME" --follow
else
  aws logs tail "/aws/lambda/$FUNCTION_NAME" --since 1h
fi

