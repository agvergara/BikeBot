# Complete Deployment Guide - Personal AWS Account

This guide will walk you through deploying the Mundimoto scraper to your personal AWS account step by step.

## What You'll Deploy

- **Lambda Function**: Runs every 8 hours to scrape motorcycle data
- **DynamoDB Table**: Stores motorcycle information
- **EventBridge Rule**: Automatically triggers the Lambda every 8 hours
- **IAM Roles**: Grants necessary permissions

## Prerequisites

Before starting, make sure you have:

1. **AWS Account** - Sign up at https://aws.amazon.com if you don't have one
2. **AWS CLI** installed and configured:
   ```bash
   # Install AWS CLI (if not installed)
   # macOS: brew install awscli
   # Linux: sudo apt-get install awscli
   # Windows: Download from AWS website
   
   # Configure with your credentials
   aws configure
   # You'll need:
   # - AWS Access Key ID
   # - AWS Secret Access Key
   # - Default region (e.g., eu-west-1, us-east-1)
   # - Default output format (json)
   ```

3. **Node.js 18+** installed:
   ```bash
   node --version  # Should be 18 or higher
   ```

4. **CDK CLI** installed globally:
   ```bash
   npm install -g aws-cdk
   cdk --version  # Verify installation
   ```

5. **Telegram Bot Token and Chat ID** (see step 1 below)

## Step-by-Step Deployment

### Step 1: Get Telegram Credentials

1. **Create a Telegram Bot:**
   - Open Telegram and search for [@BotFather](https://t.me/botfather)
   - Send `/newbot` and follow the instructions
   - Choose a name and username for your bot
   - **Save the bot token** (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

2. **Get Your Chat ID:**
   - Send a message to your new bot (any message)
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Look for `"chat":{"id":123456789}` in the response
   - **Save this chat ID**

### Step 2: Install Project Dependencies

From the project root, install all dependencies (this uses npm workspaces):

```bash
# From the project root directory
npm install
```

This will automatically install dependencies for both:
- `lambda/` - Lambda function dependencies
- `infrastructure/` - CDK infrastructure dependencies

**Alternative:** If you prefer to install separately:
```bash
cd lambda && npm install && cd ..
cd infrastructure && npm install && cd ..
```

### Step 3: Set Telegram Credentials as Environment Variables

Before deploying, set your Telegram credentials as environment variables. These will be passed to the Lambda function:

```bash
export TELEGRAM_BOT_TOKEN="your-bot-token-here"
export TELEGRAM_CHAT_ID="your-chat-id-here"
```

**Important**: These environment variables must be set in your terminal before running `cdk deploy` in the next step.

### Step 4: Build the Lambda Function

The Lambda code needs to be compiled from TypeScript to JavaScript:

```bash
# From the project root
npm run build

# Or build only the Lambda:
npm run build:lambda
```

This creates a `lambda/dist/` folder with the compiled code that CDK will package.

### Step 5: Bootstrap CDK (First Time Only)

CDK needs to set up some resources in your AWS account before it can deploy:

```bash
cd infrastructure

# Bootstrap CDK (only needed once per AWS account/region)
cdk bootstrap

# This will:
# - Create an S3 bucket for CDK assets
# - Create IAM roles for CDK
# - Set up CloudFormation stack for CDK
```

**Note:** If you're deploying to a different region, you may need to bootstrap again:
```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### Step 6: Review What Will Be Created (Optional)

Before deploying, you can preview what CDK will create:

```bash
cd infrastructure

# Synthesize CloudFormation template
cdk synth

# See differences (if stack already exists)
cdk diff
```

### Step 7: Deploy the Stack

Now deploy everything to AWS:

```bash
cd infrastructure
cdk deploy
```

**What happens:**
1. CDK will ask you to confirm: Type `y` and press Enter
2. It will:
   - Upload Lambda code to S3
   - Create DynamoDB table
   - Create Lambda function (with Telegram credentials from environment variables)
   - Create EventBridge rule
   - Set up IAM permissions
   - Create CloudFormation stack

**Deployment takes 2-5 minutes.** You'll see progress in the terminal.

**At the end, you'll see outputs like:**
```
Outputs:
MundimotoScraperStack.Motorcycles = mundimoto-motorcycles
MundimotoScraperStack.MundimotoScraperFunction = MundimotoScraperStack-ScraperFunction-XXXXX
MundimotoScraperStack.MundimotoScraperScheduleRule = MundimotoScraperStack-ScraperScheduleRule-XXXXX
```

**Note**: If you didn't set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` environment variables before deploying, the Lambda will be created but Telegram notifications will be disabled. You can update them later (see Step 9).

### Step 8: Test the Lambda Function

Test that everything works:

```bash
# Get the function name
FUNCTION_NAME=$(aws lambda list-functions \
  --query "Functions[?contains(FunctionName, 'ScraperFunction')].FunctionName" \
  --output text)

# Invoke the function manually
aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload '{}' \
  response.json

# Check the response
cat response.json
```

You should see:
```json
{
  "statusCode": 200,
  "body": "{\"success\":true,\"totalMotorcycles\":5,...}"
}
```

### Step 9: Update Telegram Credentials (If Needed)

If you didn't set the Telegram credentials before deployment, or need to update them:

**Option A: Update via AWS Console**
1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda/)
2. Find your function: `MundimotoScraperStack-ScraperFunction-XXXXX`
3. Go to Configuration → Environment variables
4. Edit `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
5. Save

**Option B: Update via AWS CLI**
```bash
FUNCTION_NAME=$(aws lambda list-functions \
  --query "Functions[?contains(FunctionName, 'ScraperFunction')].FunctionName" \
  --output text)

aws lambda update-function-configuration \
  --function-name $FUNCTION_NAME \
  --environment "Variables={
    DYNAMODB_TABLE_NAME=mundimoto-motorcycles,
    TELEGRAM_BOT_TOKEN=your-bot-token,
    TELEGRAM_CHAT_ID=your-chat-id
  }"
```

### Step 10: Check CloudWatch Logs

View the Lambda execution logs:

```bash
# Get the log group name
LOG_GROUP="/aws/lambda/$FUNCTION_NAME"

# View recent logs
aws logs tail $LOG_GROUP --follow
```

Or view in AWS Console:
1. Go to [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups)
2. Find `/aws/lambda/MundimotoScraperStack-ScraperFunction-XXXXX`
3. Click on it to see execution logs

### Step 11: Verify Everything Works

1. **Check DynamoDB has data:**
   ```bash
   aws dynamodb scan --table-name mundimoto-motorcycles --limit 5
   ```

2. **Check Telegram notifications:**
   - You should receive a message in Telegram if there are new motorcycles or price changes
   - If not, check CloudWatch logs for errors

3. **Verify EventBridge schedule:**
   ```bash
   aws events list-rules --name-prefix ScraperSchedule
   ```

## Telegram Credentials Configuration

Telegram credentials are stored as Lambda environment variables. This is a simple approach suitable for personal projects.

**How It Works:**
1. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as environment variables before deployment
2. CDK passes them to the Lambda function during deployment
3. Lambda reads them from `process.env` at runtime

**Security Notes:**
- Credentials are visible in AWS Console (Lambda → Configuration → Environment variables)
- They are encrypted at rest by AWS
- Consider using Secrets Manager for production use cases
- Never commit credentials to version control

## Understanding the Architecture

```
┌─────────────────┐
│  EventBridge    │  Every 8 hours
│  (Scheduler)    │──────────────┐
└─────────────────┘              │
                                  ▼
                          ┌──────────────┐
                          │   Lambda     │
                          │   Function   │
                          └──────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼
            ┌───────────┐  ┌──────────┐
            │ Mundimoto │  │ DynamoDB │
            │    API    │  │  Table   │
            └───────────┘  └──────────┘
                    │            │
                    └────────────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │   Telegram   │
                          │     Bot      │
                          └──────────────┘
```

## Monitoring and Maintenance

### View Recent Executions

```bash
# Check Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=$FUNCTION_NAME \
  --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

### Check Costs

1. Go to [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/home#/cost-explorer)
2. Filter by service: Lambda, DynamoDB, EventBridge
3. Expected monthly cost: **~$0** (within AWS free tier)

See the "Cost Breakdown" section below for detailed cost information.

### Update Lambda Code

If you make changes to the Lambda code:

```bash
cd lambda
npm run build
cd ../infrastructure
cdk deploy
```

## Troubleshooting

### "Access Denied" Errors

Make sure your AWS credentials have permissions for:
- CloudFormation
- Lambda
- DynamoDB
- EventBridge
- IAM (for role creation)
- S3 (for CDK assets)

<details>
<summary><strong>Minimum IAM permissions needed (click to expand)</strong></summary>

**CloudFormation:**
- `cloudformation:CreateStack`
- `cloudformation:UpdateStack`
- `cloudformation:DeleteStack`
- `cloudformation:DescribeStacks`
- `cloudformation:DescribeStackEvents`
- `cloudformation:DescribeStackResources`
- `cloudformation:GetTemplate`
- `cloudformation:ValidateTemplate`
- `cloudformation:ListStacks`

**Lambda:**
- `lambda:CreateFunction`
- `lambda:UpdateFunctionCode`
- `lambda:UpdateFunctionConfiguration`
- `lambda:GetFunction`
- `lambda:GetFunctionConfiguration`
- `lambda:DeleteFunction`
- `lambda:ListFunctions`
- `lambda:AddPermission`
- `lambda:RemovePermission`
- `lambda:InvokeFunction`

**DynamoDB:**
- `dynamodb:CreateTable`
- `dynamodb:DescribeTable`
- `dynamodb:UpdateTable`
- `dynamodb:DeleteTable`
- `dynamodb:ListTables`
- `dynamodb:PutItem`
- `dynamodb:GetItem`
- `dynamodb:Scan`
- `dynamodb:Query`
- `dynamodb:UpdateItem`
- `dynamodb:DeleteItem`

**EventBridge (CloudWatch Events):**
- `events:PutRule`
- `events:PutTargets`
- `events:RemoveTargets`
- `events:DeleteRule`
- `events:DescribeRule`
- `events:ListRules`
- `events:ListTargetsByRule`

**IAM:**
- `iam:CreateRole`
- `iam:DeleteRole`
- `iam:GetRole`
- `iam:AttachRolePolicy`
- `iam:DetachRolePolicy`
- `iam:PutRolePolicy`
- `iam:DeleteRolePolicy`
- `iam:GetRolePolicy`
- `iam:ListRolePolicies`
- `iam:ListAttachedRolePolicies`
- `iam:PassRole`
- `iam:CreatePolicy`
- `iam:GetPolicy`
- `iam:GetPolicyVersion`
- `iam:ListPolicyVersions`
- `iam:TagRole`
- `iam:UntagRole`

**S3 (for CDK bootstrap):**
- `s3:CreateBucket`
- `s3:PutObject`
- `s3:GetObject`
- `s3:ListBucket`
- `s3:DeleteObject`
- `s3:GetBucketLocation`

**SSM Parameter Store (for CDK bootstrap):**
- `ssm:PutParameter`
- `ssm:GetParameter`
- `ssm:DeleteParameter`
- `ssm:DescribeParameters`

**CloudWatch Logs (for Lambda logs):**
- `logs:CreateLogGroup`
- `logs:CreateLogStream`
- `logs:PutLogEvents`
- `logs:DescribeLogGroups`
- `logs:DescribeLogStreams`

</details>

### No Telegram Notifications

1. **Verify environment variables are set:**
   ```bash
   FUNCTION_NAME=$(aws lambda list-functions \
     --query "Functions[?contains(FunctionName, 'ScraperFunction')].FunctionName" \
     --output text)
   
   aws lambda get-function-configuration \
     --function-name $FUNCTION_NAME \
     --query 'Environment.Variables'
   ```
   Check that `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set and not empty.

2. **Check Lambda logs** for errors

3. **Test Telegram API directly:**
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage?chat_id=<YOUR_CHAT_ID>&text=Test"
   ```

### No Data in DynamoDB

1. Check Lambda logs for API errors
2. Verify the Lambda has DynamoDB permissions (should be automatic)
3. Manually invoke the Lambda to test

## Cleanup (Removing Everything)

To remove all resources and stop incurring costs:

```bash
cd infrastructure
cdk destroy
```

**Warning**: The DynamoDB table has `removalPolicy: RETAIN`, so it won't be automatically deleted. Delete it manually if needed:

```bash
aws dynamodb delete-table --table-name mundimoto-motorcycles
```


## Cost Breakdown

**Monthly costs (estimated):**

- **Lambda**: 
  - Free tier: 1M requests/month (you'll use ~90 requests/month)
  - Compute: 400,000 GB-seconds free (you'll use minimal)
  - **Cost: $0**

- **DynamoDB**:
  - Storage: < 1 MB (free tier: 25 GB)
  - Writes: ~3,600/month (free tier: 2.5M)
  - Reads: Minimal (free tier: 2.5M)
  - Uses pay-per-request (on-demand) billing
  - **Cost: $0** (within free tier)

- **EventBridge**:
  - Free tier: 1M custom events/month (you'll use ~90)
  - **Cost: $0**

**Total: ~$0/month** (within AWS free tier)

**Note**: All services are within AWS free tier limits for this use case. The Lambda runs 3 times per day (every 8 hours), which is well below free tier limits.

## Next Steps

1. ✅ Deploy the stack
2. ✅ Set Telegram credentials
3. ✅ Test manually
4. ✅ Wait for the first scheduled run (or trigger manually)
5. ✅ Receive Telegram notifications
6. ✅ Monitor costs in AWS Console

The Lambda will now run automatically every 8 hours!

