import axios from 'axios';
import { MundimotoApiResponse, Motorcycle } from '../types/Motorcycle';

const MUNDIMOTO_API_BASE = 'https://api.mundimoto.com/mundimoto-api/motorbikes';

export interface FetchMotorcyclesParams {
  limit?: number;
  offset?: number;
}

export class MundimotoApiService {
  async fetchAllMotorcycles(
    params: FetchMotorcyclesParams = {}
  ): Promise<Motorcycle[]> {
    const allMotorcycles: Motorcycle[] = [];
    let offset = params.offset || 0;
    const limit = params.limit || 40;
    let hasMore = true;

    while (hasMore) {
      const response = await this.fetchMotorcyclesPage(offset, limit);
      allMotorcycles.push(...response.motorbikes);
      
      hasMore = response.motorbikes.length === limit;
      offset += limit;
    }

    return allMotorcycles;
  }

  private async fetchMotorcyclesPage(
    offset: number,
    limit: number
  ): Promise<MundimotoApiResponse> {
    const params = new URLSearchParams({
      order_by: 'default',
      limit: limit.toString(),
      offset: offset.toString(),
      country: 'es',
      flow: 'SALE',
      driving_licenses: 'A1',
      stores: '5004ee3f-1b3a-4541-8a23-831d381fbe2c',
      condition: 'USED',
    });

    const response = await axios.get<MundimotoApiResponse>(
      `${MUNDIMOTO_API_BASE}?${params.toString()}`,
      {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    return response.data;
  }
}

