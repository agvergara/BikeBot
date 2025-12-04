import { TelegramService } from '../services/Telegram';
import axios from 'axios';
import { StoredMotorcycle } from '../types/Motorcycle';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TelegramService', () => {
  let service: TelegramService;
  const botToken = 'test-bot-token';
  const chatId = 'test-chat-id';

  beforeEach(() => {
    service = new TelegramService(botToken, chatId);
    jest.clearAllMocks();
    mockedAxios.post.mockResolvedValue({ data: { ok: true } });
  });

  describe('sendMessage', () => {
    it('should send a message to Telegram', async () => {
      await service.sendMessage('Test message');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: 'Test message',
          parse_mode: 'HTML',
        }
      );
    });

    it('should handle errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.sendMessage('Test')).rejects.toThrow('Network error');
    });
  });

  describe('notifyNewMotorcycle', () => {
    it('should format and send new motorcycle notification with photo', async () => {
      const motorcycle: StoredMotorcycle = {
        id: '1',
        brand: 'Honda',
        model: 'SH Mode 125',
        motorbike_type: 'SCOOTER',
        price: 2000,
        imageUrl: 'https://example.com/image.jpg',
        lastUpdated: '2024-01-01',
        createdAt: '2024-01-01',
      };

      await service.notifyNewMotorcycle(motorcycle);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const callArgs = mockedAxios.post.mock.calls[0][1] as { photo: string; caption: string; reply_markup: any };
      expect(callArgs.photo).toBe('https://example.com/image.jpg');
      expect(callArgs.caption).toContain('New Motorcycle Available');
      expect(callArgs.caption).toContain('Honda');
      expect(callArgs.caption).toContain('SH Mode 125');
      expect(callArgs.caption).toContain('2000');
      expect(callArgs.reply_markup.inline_keyboard).toBeDefined();
      expect(callArgs.reply_markup.inline_keyboard[0][0].text).toBe('View on Mundimoto');
    });

    it('should send text message when no image URL', async () => {
      const motorcycle: StoredMotorcycle = {
        id: '1',
        brand: 'Honda',
        model: 'SH Mode 125',
        motorbike_type: 'SCOOTER',
        price: 2000,
        imageUrl: '',
        lastUpdated: '2024-01-01',
        createdAt: '2024-01-01',
      };

      await service.notifyNewMotorcycle(motorcycle);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const callArgs = mockedAxios.post.mock.calls[0][1] as { text: string; reply_markup: any };
      expect(callArgs.text).toContain('New Motorcycle Available');
      expect(callArgs.text).toContain('Honda');
      expect(callArgs.reply_markup.inline_keyboard).toBeDefined();
    });
  });

  describe('notifyPriceUpdate', () => {
    it('should format and send price update notification with photo', async () => {
      const motorcycle: StoredMotorcycle = {
        id: '1',
        brand: 'Honda',
        model: 'SH Mode 125',
        motorbike_type: 'SCOOTER',
        price: 2500,
        imageUrl: 'https://example.com/image.jpg',
        lastUpdated: '2024-01-01',
        createdAt: '2024-01-01',
      };

      await service.notifyPriceUpdate(motorcycle, 2000);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const callArgs = mockedAxios.post.mock.calls[0][1] as { photo: string; caption: string; reply_markup: any };
      expect(callArgs.photo).toBe('https://example.com/image.jpg');
      expect(callArgs.caption).toContain('Price Update');
      expect(callArgs.caption).toContain('2000');
      expect(callArgs.caption).toContain('2500');
      expect(callArgs.reply_markup.inline_keyboard).toBeDefined();
      expect(callArgs.reply_markup.inline_keyboard[0][0].text).toBe('View on Mundimoto');
    });

    it('should send text message when no image URL', async () => {
      const motorcycle: StoredMotorcycle = {
        id: '1',
        brand: 'Honda',
        model: 'SH Mode 125',
        motorbike_type: 'SCOOTER',
        price: 2500,
        imageUrl: '',
        lastUpdated: '2024-01-01',
        createdAt: '2024-01-01',
      };

      await service.notifyPriceUpdate(motorcycle, 2000);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const callArgs = mockedAxios.post.mock.calls[0][1] as { text: string; reply_markup: any };
      expect(callArgs.text).toContain('Price Update');
      expect(callArgs.reply_markup.inline_keyboard).toBeDefined();
    });
  });
});

