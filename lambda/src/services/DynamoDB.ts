import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand as DocScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { StoredMotorcycle } from '../types/Motorcycle';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export class DynamoDBService {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async getMotorcycle(id: string): Promise<StoredMotorcycle | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { id },
    });

    const response = await docClient.send(command);
    return (response.Item as StoredMotorcycle) || null;
  }

  async getAllMotorcycles(): Promise<StoredMotorcycle[]> {
    const motorcycles: StoredMotorcycle[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const command = new DocScanCommand({
        TableName: this.tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const response = await docClient.send(command);
      if (response.Items) {
        motorcycles.push(...(response.Items as StoredMotorcycle[]));
      }
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return motorcycles;
  }

  async saveMotorcycle(motorcycle: StoredMotorcycle): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: motorcycle,
    });

    await docClient.send(command);
  }

  async saveMotorcycles(motorcycles: StoredMotorcycle[]): Promise<void> {
    // DynamoDB batch write would be better for large datasets,
    // but for simplicity we'll use individual puts
    await Promise.all(
      motorcycles.map((motorcycle) => this.saveMotorcycle(motorcycle))
    );
  }
}

