#!/bin/bash

# Script to manually invoke the Mundimoto Scraper Lambda function
# Usage: ./scripts/invoke-lambda.sh

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
echo "🚀 Invoking Lambda function..."

# Invoke the function
RESPONSE_FILE=$(mktemp)
PAYLOAD_FILE=$(mktemp)
echo '{"source":"manual-invocation"}' > "$PAYLOAD_FILE"

aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --cli-binary-format raw-in-base64-out \
  --payload file://"$PAYLOAD_FILE" \
  "$RESPONSE_FILE" > /dev/null

# Check if invocation was successful
if [ $? -eq 0 ]; then
  echo "✅ Lambda invoked successfully!"
  echo ""
  echo "📄 Response:"
  cat "$RESPONSE_FILE" | jq '.' 2>/dev/null || cat "$RESPONSE_FILE"
  echo ""
  
  # Clean up
  rm "$RESPONSE_FILE" "$PAYLOAD_FILE"
  
  echo "📊 To view logs, run:"
  echo "   aws logs tail /aws/lambda/$FUNCTION_NAME --follow"
else
  echo "❌ Error invoking Lambda function"
  rm "$RESPONSE_FILE" "$PAYLOAD_FILE"
  exit 1
fi

