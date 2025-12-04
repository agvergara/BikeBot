import { Handler } from 'aws-lambda';
import { MundimotoApiService } from './services/MundimotoApi';
import { DynamoDBService } from './services/DynamoDB';
import { TelegramService } from './services/Telegram';
import { MotorcycleProcessor } from './services/MotorcycleProcessor';

interface LambdaEvent {
  source?: string;
}

export const handler: Handler<LambdaEvent> = async (event, context) => {
  console.log('Starting motorcycle scraper job', { event });

  try {
    // Get environment variables
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (!tableName) {
      throw new Error('DYNAMODB_TABLE_NAME environment variable is required');
    }

    // Initialize services
    const apiService = new MundimotoApiService();
    const dynamoDB = new DynamoDBService(tableName);
    
    // Initialize Telegram service if credentials are provided
    let telegram: TelegramService | null = null;
    if (telegramBotToken && telegramChatId) {
      telegram = new TelegramService(telegramBotToken, telegramChatId);
      console.log('Telegram service initialized');
    } else {
      console.warn('Telegram credentials not provided, notifications will be skipped');
    }
    
    // Create a dummy telegram service if not provided (for processor initialization)
    const dummyTelegram = telegram || ({} as TelegramService);
    const processor = new MotorcycleProcessor(dynamoDB, dummyTelegram);

    // Fetch all motorcycles from API
    console.log('Fetching motorcycles from Mundimoto API...');
    const motorcycles = await apiService.fetchAllMotorcycles();
    console.log(`Fetched ${motorcycles.length} motorcycles`);

    // Process and compare with existing data
    console.log('Processing motorcycles...');
    const changes = await processor.processMotorcycles(motorcycles);
    console.log(`Found ${changes.length} changes:`, {
      new: changes.filter((c) => c.type === 'new').length,
      priceUpdates: changes.filter((c) => c.type === 'price_update').length,
    });

    // Send notifications
    if (telegram && changes.length > 0) {
      console.log('Sending Telegram notifications...');
      await telegram.notifyChanges(changes);
      console.log('Notifications sent');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        totalMotorcycles: motorcycles.length,
        changes: {
          new: changes.filter((c) => c.type === 'new').length,
          priceUpdates: changes.filter((c) => c.type === 'price_update').length,
        },
      }),
    };
  } catch (error) {
    console.error('Error in motorcycle scraper:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

