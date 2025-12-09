import { Motorcycle, StoredMotorcycle, MotorcycleChange } from '../types/Motorcycle';
import { DynamoDBService } from './DynamoDB';
import { TelegramService } from './Telegram';

export class MotorcycleProcessor {
  constructor(
    private dynamoDB: DynamoDBService,
    private telegram?: TelegramService
  ) {}

  async processMotorcycles(motorcycles: Motorcycle[]): Promise<MotorcycleChange[]> {
    const changes: MotorcycleChange[] = [];
    const existingMotorcycles = await this.dynamoDB.getAllMotorcycles();
    const existingMap = new Map(
      existingMotorcycles.map((m) => [m.id, m])
    );

    const now = new Date().toISOString();

    // Filter out SCOOTER and MaxiScooter types, and only keep 125cc motorcycles
    const excludedTypes = ['SCOOTER', 'MaxiScooter'];
    
    for (const motorcycle of motorcycles) {
      // Skip excluded types and non-125cc motorcycles
      if (excludedTypes.includes(motorcycle.motorbike_type) || motorcycle.cc !== 125) {
        continue;
      }
      
      const existing = existingMap.get(motorcycle.id);
      const stored = this.convertToStored(
        motorcycle,
        now,
        existing?.createdAt // Preserve original creation date
      );

      if (!existing) {
        // New motorcycle - save to DynamoDB
        changes.push({
          type: 'new',
          motorcycle: stored,
        });
        await this.dynamoDB.saveMotorcycle(stored);
      } else if (existing.price !== stored.price) {
        // Price update - update in DynamoDB
        changes.push({
          type: 'price_update',
          motorcycle: stored,
          oldPrice: existing.price,
        });
        await this.dynamoDB.saveMotorcycle(stored);
      }
      // If motorcycle exists and price hasn't changed, don't save to DynamoDB
    }

    return changes;
  }

  private convertToStored(
    motorcycle: Motorcycle,
    timestamp: string,
    existingCreatedAt?: string
  ): StoredMotorcycle {
    const imageUrl =
      motorcycle.thumbnail_images?.[0]?.medium ||
      motorcycle.thumbnail_images?.[0]?.small ||
      motorcycle.thumbnail_images?.[0]?.detail ||
      '';

    return {
      id: motorcycle.id,
      brand: motorcycle.brand,
      model: motorcycle.model,
      motorbike_type: motorcycle.motorbike_type,
      price: motorcycle.price,
      imageUrl,
      lastUpdated: timestamp,
      createdAt: existingCreatedAt || timestamp, // Preserve original creation date
    };
  }
}

