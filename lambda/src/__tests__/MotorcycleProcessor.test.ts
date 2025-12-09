import { MotorcycleProcessor } from '../services/MotorcycleProcessor';
import { DynamoDBService } from '../services/DynamoDB';
import { TelegramService } from '../services/Telegram';
import { Motorcycle, StoredMotorcycle } from '../types/Motorcycle';

describe('MotorcycleProcessor', () => {
  let processor: MotorcycleProcessor;
  let mockDynamoDB: jest.Mocked<DynamoDBService>;
  let mockTelegram: jest.Mocked<TelegramService>;

  beforeEach(() => {
    mockDynamoDB = {
      getAllMotorcycles: jest.fn(),
      saveMotorcycle: jest.fn(),
      saveMotorcycles: jest.fn(),
      getMotorcycle: jest.fn(),
    } as any;

    mockTelegram = {
      notifyChanges: jest.fn(),
      sendMessage: jest.fn(),
      notifyNewMotorcycle: jest.fn(),
      notifyPriceUpdate: jest.fn(),
    } as any;

    processor = new MotorcycleProcessor(mockDynamoDB, mockTelegram);
  });

  describe('processMotorcycles', () => {
    it('should identify new motorcycles', async () => {
      const motorcycles: Motorcycle[] = [
        {
          id: '1',
          brand: 'Honda',
          model: 'SH Mode 125',
          model_id: 'm1',
          version_id: 'v1',
          kms: 10000,
          year: 2020,
          driving_license: 'A1',
          price: 2000,
          finance_price: 2000,
          renting_price: null,
          cc: 125,
          motorbike_type: 'NAKED',
          thumbnail_images: [{ small: 'img1.jpg', medium: 'img1.jpg', detail: 'img1.jpg' }],
          damage_images: [],
          thumbnail_damage_images: [],
          quota: 50,
          fast_delivery_badge: null,
          is_booking_available: true,
          is_limitable: false,
          is_limited: false,
          emission_type: null,
          is_new: false,
          tags: [],
          itv_next_date: '2025-01-01',
          num_keys: 2,
          num_seats: 2,
          deductible_vat: false,
          invisible: false,
        },
      ];

      mockDynamoDB.getAllMotorcycles.mockResolvedValueOnce([]);

      const changes = await processor.processMotorcycles(motorcycles);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('new');
      expect(changes[0].motorcycle.id).toBe('1');
      expect(mockDynamoDB.saveMotorcycle).toHaveBeenCalledTimes(1);
    });

    it('should identify price updates', async () => {
      const motorcycles: Motorcycle[] = [
        {
          id: '1',
          brand: 'Honda',
          model: 'SH Mode 125',
          model_id: 'm1',
          version_id: 'v1',
          kms: 10000,
          year: 2020,
          driving_license: 'A1',
          price: 2500, // Price changed from 2000
          finance_price: 2500,
          renting_price: null,
          cc: 125,
          motorbike_type: 'NAKED',
          thumbnail_images: [{ small: 'img1.jpg', medium: 'img1.jpg', detail: 'img1.jpg' }],
          damage_images: [],
          thumbnail_damage_images: [],
          quota: 50,
          fast_delivery_badge: null,
          is_booking_available: true,
          is_limitable: false,
          is_limited: false,
          emission_type: null,
          is_new: false,
          tags: [],
          itv_next_date: '2025-01-01',
          num_keys: 2,
          num_seats: 2,
          deductible_vat: false,
          invisible: false,
        },
      ];

      const existing: StoredMotorcycle = {
        id: '1',
        brand: 'Honda',
        model: 'SH Mode 125',
        motorbike_type: 'NAKED',
        price: 2000,
        imageUrl: 'img1.jpg',
        lastUpdated: '2024-01-01',
        createdAt: '2024-01-01',
      };

      mockDynamoDB.getAllMotorcycles.mockResolvedValueOnce([existing]);

      const changes = await processor.processMotorcycles(motorcycles);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('price_update');
      expect(changes[0].oldPrice).toBe(2000);
      expect(changes[0].motorcycle.price).toBe(2500);
      expect(mockDynamoDB.saveMotorcycle).toHaveBeenCalledTimes(1);
    });

    it('should not create changes for unchanged motorcycles', async () => {
      const motorcycles: Motorcycle[] = [
        {
          id: '1',
          brand: 'Honda',
          model: 'SH Mode 125',
          model_id: 'm1',
          version_id: 'v1',
          kms: 10000,
          year: 2020,
          driving_license: 'A1',
          price: 2000,
          finance_price: 2000,
          renting_price: null,
          cc: 125,
          motorbike_type: 'NAKED',
          thumbnail_images: [{ small: 'img1.jpg', medium: 'img1.jpg', detail: 'img1.jpg' }],
          damage_images: [],
          thumbnail_damage_images: [],
          quota: 50,
          fast_delivery_badge: null,
          is_booking_available: true,
          is_limitable: false,
          is_limited: false,
          emission_type: null,
          is_new: false,
          tags: [],
          itv_next_date: '2025-01-01',
          num_keys: 2,
          num_seats: 2,
          deductible_vat: false,
          invisible: false,
        },
      ];

      const existing: StoredMotorcycle = {
        id: '1',
        brand: 'Honda',
        model: 'SH Mode 125',
        motorbike_type: 'NAKED',
        price: 2000,
        imageUrl: 'img1.jpg',
        lastUpdated: '2024-01-01',
        createdAt: '2024-01-01',
      };

      mockDynamoDB.getAllMotorcycles.mockResolvedValueOnce([existing]);

      const changes = await processor.processMotorcycles(motorcycles);

      expect(changes).toHaveLength(0);
      expect(mockDynamoDB.saveMotorcycle).not.toHaveBeenCalled(); // Don't save if unchanged
    });

    it('should filter out SCOOTER and MaxiScooter types, and only keep 125cc motorcycles', async () => {
      const motorcycles: Motorcycle[] = [
        {
          id: '1',
          brand: 'Honda',
          model: 'SH Mode 125',
          model_id: 'm1',
          version_id: 'v1',
          kms: 10000,
          year: 2020,
          driving_license: 'A1',
          price: 2000,
          finance_price: 2000,
          renting_price: null,
          cc: 125,
          motorbike_type: 'SCOOTER',
          thumbnail_images: [{ small: 'img1.jpg', medium: 'img1.jpg', detail: 'img1.jpg' }],
          damage_images: [],
          thumbnail_damage_images: [],
          quota: 50,
          fast_delivery_badge: null,
          is_booking_available: true,
          is_limitable: false,
          is_limited: false,
          emission_type: null,
          is_new: false,
          tags: [],
          itv_next_date: '2025-01-01',
          num_keys: 2,
          num_seats: 2,
          deductible_vat: false,
          invisible: false,
        },
        {
          id: '2',
          brand: 'Yamaha',
          model: 'XMAX 125',
          model_id: 'm2',
          version_id: 'v2',
          kms: 5000,
          year: 2021,
          driving_license: 'A1',
          price: 3000,
          finance_price: 3000,
          renting_price: null,
          cc: 125,
          motorbike_type: 'MaxiScooter',
          thumbnail_images: [{ small: 'img2.jpg', medium: 'img2.jpg', detail: 'img2.jpg' }],
          damage_images: [],
          thumbnail_damage_images: [],
          quota: 50,
          fast_delivery_badge: null,
          is_booking_available: true,
          is_limitable: false,
          is_limited: false,
          emission_type: null,
          is_new: false,
          tags: [],
          itv_next_date: '2025-01-01',
          num_keys: 2,
          num_seats: 2,
          deductible_vat: false,
          invisible: false,
        },
        {
          id: '3',
          brand: 'Kawasaki',
          model: 'Z125',
          model_id: 'm3',
          version_id: 'v3',
          kms: 8000,
          year: 2020,
          driving_license: 'A1',
          price: 2500,
          finance_price: 2500,
          renting_price: null,
          cc: 125,
          motorbike_type: 'NAKED',
          thumbnail_images: [{ small: 'img3.jpg', medium: 'img3.jpg', detail: 'img3.jpg' }],
          damage_images: [],
          thumbnail_damage_images: [],
          quota: 50,
          fast_delivery_badge: null,
          is_booking_available: true,
          is_limitable: false,
          is_limited: false,
          emission_type: null,
          is_new: false,
          tags: [],
          itv_next_date: '2025-01-01',
          num_keys: 2,
          num_seats: 2,
          deductible_vat: false,
          invisible: false,
        },
      ];

      mockDynamoDB.getAllMotorcycles.mockResolvedValueOnce([]);

      const changes = await processor.processMotorcycles(motorcycles);

      // Only the NAKED type should be processed (id: '3')
      expect(changes).toHaveLength(1);
      expect(changes[0].motorcycle.id).toBe('3');
      expect(changes[0].motorcycle.motorbike_type).toBe('NAKED');
      expect(mockDynamoDB.saveMotorcycle).toHaveBeenCalledTimes(1);
      expect(mockDynamoDB.saveMotorcycle).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '3',
          motorbike_type: 'NAKED',
        })
      );
    });

    it('should filter out motorcycles that are not 125cc', async () => {
      const motorcycles: Motorcycle[] = [
        {
          id: '1',
          brand: 'Honda',
          model: 'CBR 250',
          model_id: 'm1',
          version_id: 'v1',
          kms: 10000,
          year: 2020,
          driving_license: 'A2',
          price: 3000,
          finance_price: 3000,
          renting_price: null,
          cc: 250, // Not 125cc
          motorbike_type: 'NAKED',
          thumbnail_images: [{ small: 'img1.jpg', medium: 'img1.jpg', detail: 'img1.jpg' }],
          damage_images: [],
          thumbnail_damage_images: [],
          quota: 50,
          fast_delivery_badge: null,
          is_booking_available: true,
          is_limitable: false,
          is_limited: false,
          emission_type: null,
          is_new: false,
          tags: [],
          itv_next_date: '2025-01-01',
          num_keys: 2,
          num_seats: 2,
          deductible_vat: false,
          invisible: false,
        },
        {
          id: '2',
          brand: 'Yamaha',
          model: 'MT-125',
          model_id: 'm2',
          version_id: 'v2',
          kms: 5000,
          year: 2021,
          driving_license: 'A1',
          price: 2500,
          finance_price: 2500,
          renting_price: null,
          cc: 125, // 125cc - should be kept
          motorbike_type: 'NAKED',
          thumbnail_images: [{ small: 'img2.jpg', medium: 'img2.jpg', detail: 'img2.jpg' }],
          damage_images: [],
          thumbnail_damage_images: [],
          quota: 50,
          fast_delivery_badge: null,
          is_booking_available: true,
          is_limitable: false,
          is_limited: false,
          emission_type: null,
          is_new: false,
          tags: [],
          itv_next_date: '2025-01-01',
          num_keys: 2,
          num_seats: 2,
          deductible_vat: false,
          invisible: false,
        },
        {
          id: '3',
          brand: 'Kawasaki',
          model: 'Ninja 300',
          model_id: 'm3',
          version_id: 'v3',
          kms: 8000,
          year: 2020,
          driving_license: 'A2',
          price: 4000,
          finance_price: 4000,
          renting_price: null,
          cc: 300, // Not 125cc
          motorbike_type: 'SPORT',
          thumbnail_images: [{ small: 'img3.jpg', medium: 'img3.jpg', detail: 'img3.jpg' }],
          damage_images: [],
          thumbnail_damage_images: [],
          quota: 50,
          fast_delivery_badge: null,
          is_booking_available: true,
          is_limitable: false,
          is_limited: false,
          emission_type: null,
          is_new: false,
          tags: [],
          itv_next_date: '2025-01-01',
          num_keys: 2,
          num_seats: 2,
          deductible_vat: false,
          invisible: false,
        },
      ];

      mockDynamoDB.getAllMotorcycles.mockResolvedValueOnce([]);

      const changes = await processor.processMotorcycles(motorcycles);

      // Only the 125cc motorcycle (id: '2') should be processed
      expect(changes).toHaveLength(1);
      expect(changes[0].motorcycle.id).toBe('2');
      expect(changes[0].motorcycle.motorbike_type).toBe('NAKED');
      expect(mockDynamoDB.saveMotorcycle).toHaveBeenCalledTimes(1);
      expect(mockDynamoDB.saveMotorcycle).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '2',
          motorbike_type: 'NAKED',
        })
      );
    });
  });
});

