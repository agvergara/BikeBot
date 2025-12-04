import {
  Stack,
  StackProps,
  Duration,
  RemovalPolicy,
  CfnOutput,
} from 'aws-cdk-lib';
import {
  Function,
  Runtime,
  Code,
} from 'aws-cdk-lib/aws-lambda';
import {
  Table,
  AttributeType,
  BillingMode,
} from 'aws-cdk-lib/aws-dynamodb';
import {
  Rule,
  Schedule,
} from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import * as path from 'path';

export class MundimotoScraperStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const motorcyclesTable = new Table(this, 'MotorcyclesTable', {
      tableName: 'mundimoto-motorcycles',
      partitionKey: { name: 'id', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN, // Keep data when stack is deleted
      pointInTimeRecovery: true,
    });

    // Lambda Function
    const scraperFunction = new Function(this, 'ScraperFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset(path.join(__dirname, '../../lambda'), {
        bundling: {
          image: Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'sh', '-c',
            'cp -r /asset-input/dist/. /asset-output/ && cd /asset-input && npm install --omit=dev --no-audit --no-fund --cache /tmp/.npm && cp -r node_modules /asset-output/ && echo "Build timestamp: $(date)" > /asset-output/.build-info',
          ],
          user: 'root',
        },
      }),
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: {
        DYNAMODB_TABLE_NAME: motorcyclesTable.tableName,
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
      },
    });

    // Grant permissions to Lambda
    motorcyclesTable.grantReadWriteData(scraperFunction);

    // EventBridge Rule - Run every 8 hours
    const rule = new Rule(this, 'ScraperScheduleRule', {
      schedule: Schedule.rate(Duration.hours(8)),
      description: 'Trigger motorcycle scraper every 8 hours',
    });

    rule.addTarget(new LambdaFunction(scraperFunction));

    // Outputs
    new CfnOutput(this, 'Motorcycles', {
      value: motorcyclesTable.tableName,
      description: 'DynamoDB table for motorcycles',
    });

    new CfnOutput(this, 'MundimotoScraperFunction', {
      value: scraperFunction.functionName,
      description: 'Mundimoto scraper function name',
    });

    new CfnOutput(this, 'MundimotoScraperScheduleRule', {
      value: rule.ruleName,
      description: 'Mundimoto scraper schedule rule name',
    });
  }
}

