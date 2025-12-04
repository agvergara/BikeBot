import { MundimotoApiService } from '../services/MundimotoApi';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MundimotoApiService', () => {
  let service: MundimotoApiService;

  beforeEach(() => {
    service = new MundimotoApiService();
    jest.clearAllMocks();
  });

  describe('fetchAllMotorcycles', () => {
    it('should fetch all motorcycles across multiple pages', async () => {
      const mockResponse1 = {
        data: {
          motorbikes: [
            { id: '1', brand: 'Honda', model: 'SH Mode 125', price: 2000 },
            { id: '2', brand: 'Yamaha', model: 'NMAX 125', price: 2500 },
          ],
          total_count: 3,
        },
      };

      const mockResponse2 = {
        data: {
          motorbikes: [{ id: '3', brand: 'Piaggio', model: 'Vespa 125', price: 3000 }],
          total_count: 3,
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result = await service.fetchAllMotorcycles({ limit: 2 });

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
      expect(result[2].id).toBe('3');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should handle single page of results', async () => {
      const mockResponse = {
        data: {
          motorbikes: [{ id: '1', brand: 'Honda', model: 'SH Mode 125', price: 2000 }],
          total_count: 1,
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await service.fetchAllMotorcycles({ limit: 40 });

      expect(result).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(service.fetchAllMotorcycles()).rejects.toThrow('API Error');
    });
  });
});

