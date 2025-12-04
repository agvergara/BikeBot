# Mundimoto Motorcycle Scraper

A serverless application that scrapes 125cc motorcycles from the Mundimoto API, stores them in DynamoDB, and sends Telegram notifications for new motorcycles or price updates.

**Note**: The scraper filters out SCOOTER and MaxiScooter types - only other motorcycle types (NAKED, TRAIL, etc.) are saved to DynamoDB and trigger notifications.

## Architecture

- **Lambda Function**: Fetches motorcycles from Mundimoto API, processes changes, and sends notifications
- **DynamoDB Table**: Stores motorcycle data (id, brand, model, type, price, image URL)
- **EventBridge Rule**: Triggers Lambda every 8 hours
- **Telegram Bot**: Sends notifications for new motorcycles and price updates

## Project Structure

```
.
├── lambda/                    # Lambda function code
│   ├── src/
│   │   ├── index.ts          # Lambda handler
│   │   ├── services/         # Business logic services
│   │   ├── types/            # TypeScript types
│   │   └── __tests__/        # Unit tests
│   ├── package.json
│   └── tsconfig.json
├── infrastructure/            # CDK infrastructure code
│   ├── lib/
│   │   └── MundimotoScraperStack.ts
│   ├── bin/
│   │   └── app.ts
│   ├── package.json
│   └── tsconfig.json
├── scripts/                   # Utility scripts
│   ├── invoke-lambda.sh      # Manual Lambda invocation
│   └── view-logs.sh          # CloudWatch logs viewer
├── DEPLOYMENT_GUIDE.md       # Detailed deployment guide
└── README.md
```

## Prerequisites

- Node.js 18+
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (`npm install -g aws-cdk`)
- Telegram Bot Token and Chat ID

## Setup

### 1. Get Telegram Bot Credentials

1. Create a bot with [@BotFather](https://t.me/botfather) on Telegram
2. Get your bot token
3. Get your chat ID (you can use [@userinfobot](https://t.me/userinfobot) or send a message to your bot and check the API)

### 2. Install Dependencies

Install all dependencies (Lambda and Infrastructure) from the root:

```bash
npm install
```

This uses npm workspaces to install dependencies for both `lambda/` and `infrastructure/` folders.

### 3. Build Lambda Function

Build from the root:

```bash
npm run build
```

Or build individually:
```bash
npm run build:lambda    # Build Lambda only
npm run build:infra      # Build CDK infrastructure only
```

### 4. Set Telegram Credentials

Set the Telegram credentials as environment variables before deploying. These will be passed to the Lambda function:

```bash
export TELEGRAM_BOT_TOKEN="your-bot-token"
export TELEGRAM_CHAT_ID="your-chat-id"
```

**Note:** You can also run workspace-specific commands from the root:
```bash
npm run test              # Run Lambda tests
npm run build:lambda      # Build Lambda only
npm run build:infra       # Build CDK infrastructure only
npm run deploy            # Deploy CDK stack (from infrastructure workspace)
npm run synth             # Synthesize CDK template
npm run diff              # Show CDK diff
```

## Deployment

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

**Quick Start:**
```bash
# 1. Install dependencies (from root)
npm install

# 2. Set Telegram credentials
export TELEGRAM_BOT_TOKEN="your-bot-token"
export TELEGRAM_CHAT_ID="your-chat-id"

# 3. Build everything
npm run build

# 4. Bootstrap CDK (first time only)
cd infrastructure
AWS_ACCOUNT=your-account-id AWS_REGION=us-east-1 cdk bootstrap

# 5. Deploy infrastructure
AWS_ACCOUNT=your-account-id AWS_REGION=us-east-1 cdk deploy
```

**Note**: For first-time deployment, you may need to set `AWS_ACCOUNT` and `AWS_REGION` environment variables. See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## Testing

### Run Unit Tests

```bash
cd lambda
npm test
```

### Run Tests with Coverage

```bash
cd lambda
npm run test:coverage
```

### Manual Lambda Invocation

You can manually trigger the Lambda function to test it:

```bash
aws lambda invoke \
  --function-name MundimotoScraperStack-ScraperFunction-XXXXX \
  --payload '{}' \
  response.json
```

## Environment Variables

The Lambda function uses these environment variables:

- `DYNAMODB_TABLE_NAME`: Automatically set by CDK
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token (set via environment variable before deployment)
- `TELEGRAM_CHAT_ID`: Your Telegram chat ID (set via environment variable before deployment)

**Note**: Set these environment variables in your terminal before running `cdk deploy`. They will be passed to the Lambda function during deployment.

## DynamoDB Schema

The table stores motorcycles with the following structure:

```typescript
{
  id: string,              // Primary key
  brand: string,
  model: string,
  motorbike_type: string,  // Excludes SCOOTER and MaxiScooter
  price: number,
  imageUrl: string,
  lastUpdated: string,    // ISO timestamp
  createdAt: string       // ISO timestamp
}
```

**Note**: Only motorcycles with types other than `SCOOTER` and `MaxiScooter` are saved to DynamoDB.

## Monitoring

- Check CloudWatch Logs for the Lambda function execution logs
- Monitor DynamoDB metrics for table usage
- Check EventBridge metrics for schedule execution

## Manual Invocation

To manually trigger the Lambda function (useful for testing):

```bash
./scripts/invoke-lambda.sh
```

To view CloudWatch logs:

```bash
# View recent logs (last hour)
./scripts/view-logs.sh

# Follow logs in real-time
./scripts/view-logs.sh --follow
```

Or use AWS CLI directly:

```bash
# Get function name
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name MundimotoScraperStack \
  --query 'Stacks[0].Outputs[?OutputKey==`MundimotoScraperFunction`].OutputValue' \
  --output text)

# Invoke function
aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload '{"source":"manual-test"}' \
  response.json
```

## Cost Estimation

- **Lambda**: Free tier includes 1M requests/month
- **DynamoDB**: Pay-per-request, very low cost for this use case
- **EventBridge**: Free tier includes 1M custom events/month
- **Data Transfer**: Minimal

Estimated monthly cost: < $1 for typical usage

## Troubleshooting

### Lambda Timeout

If the Lambda times out, increase the timeout in the CDK stack:

```typescript
timeout: cdk.Duration.minutes(10),
```

### Telegram Notifications Not Working

1. Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set correctly
2. Check CloudWatch Logs for error messages
3. Ensure the bot has permission to send messages to your chat

### No Changes Detected

- Check if motorcycles are being fetched from the API
- Verify DynamoDB table has data
- Check Lambda logs for processing errors

## Cleanup

To remove all resources:

```bash
cd infrastructure
cdk destroy
```

**Note**: The DynamoDB table has `removalPolicy: RETAIN`, so it won't be deleted. You'll need to delete it manually if desired.
