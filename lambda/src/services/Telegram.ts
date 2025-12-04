import axios from 'axios';
import { MotorcycleChange, StoredMotorcycle } from '../types/Motorcycle';

export class TelegramService {
  private botToken: string;
  private chatId: string;
  private apiUrl: string;

  constructor(botToken: string, chatId: string) {
    this.botToken = botToken;
    this.chatId = chatId;
    this.apiUrl = `https://api.telegram.org/bot${botToken}`;
  }

  async sendMessage(
    text: string,
    inlineKeyboard?: Array<Array<{ text: string; url: string }>>
  ): Promise<void> {
    try {
      const payload: any = {
        chat_id: this.chatId,
        text,
        parse_mode: 'HTML',
      };

      if (inlineKeyboard) {
        payload.reply_markup = {
          inline_keyboard: inlineKeyboard,
        };
      }

      await axios.post(`${this.apiUrl}/sendMessage`, payload);
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  }

  async sendPhoto(
    photoUrl: string,
    caption: string,
    inlineKeyboard?: Array<Array<{ text: string; url: string }>>
  ): Promise<void> {
    try {
      const payload: any = {
        chat_id: this.chatId,
        photo: photoUrl,
        caption,
        parse_mode: 'HTML',
      };

      if (inlineKeyboard) {
        payload.reply_markup = {
          inline_keyboard: inlineKeyboard,
        };
      }

      await axios.post(`${this.apiUrl}/sendPhoto`, payload);
    } catch (error) {
      console.error('Error sending Telegram photo:', error);
      throw error;
    }
  }

  async notifyNewMotorcycle(motorcycle: StoredMotorcycle): Promise<void> {
    const { text, url } = this.formatNewMotorcycleMessage(motorcycle);
    const inlineKeyboard = [[{ text: 'View on Mundimoto', url }]];
    
    // Send photo if image URL is available, otherwise send text message
    if (motorcycle.imageUrl) {
      await this.sendPhoto(motorcycle.imageUrl, text, inlineKeyboard);
    } else {
      await this.sendMessage(text, inlineKeyboard);
    }
  }

  async notifyPriceUpdate(
    motorcycle: StoredMotorcycle,
    oldPrice: number
  ): Promise<void> {
    const { text, url } = this.formatPriceUpdateMessage(motorcycle, oldPrice);
    const inlineKeyboard = [[{ text: 'View on Mundimoto', url }]];
    
    // Send photo if image URL is available, otherwise send text message
    if (motorcycle.imageUrl) {
      await this.sendPhoto(motorcycle.imageUrl, text, inlineKeyboard);
    } else {
      await this.sendMessage(text, inlineKeyboard);
    }
  }

  async notifyChanges(changes: MotorcycleChange[]): Promise<void> {
    if (changes.length === 0) return;

    // Send individual messages for each change
    for (const change of changes) {
      if (change.type === 'new') {
        await this.notifyNewMotorcycle(change.motorcycle);
      } else if (change.type === 'price_update' && change.oldPrice) {
        await this.notifyPriceUpdate(change.motorcycle, change.oldPrice);
      }
    }
  }

  private formatMotorcycleMessage(
    header: string,
    motorcycle: StoredMotorcycle,
    priceInfo: string
  ): { text: string; url: string } {
    const motoUrl = `https://mundimoto.com/es/moto/${motorcycle.id}`;
    const text = `${header}\n\n` +
      `🏍️ <b>${motorcycle.brand} ${motorcycle.model}</b>\n` +
      `📋 Type: ${motorcycle.motorbike_type}\n` +
      priceInfo +
      `🆔 ID: ${motorcycle.id}`;
    
    return { text, url: motoUrl };
  }

  private formatNewMotorcycleMessage(
    motorcycle: StoredMotorcycle
  ): { text: string; url: string } {
    const price = this.formatPrice(motorcycle.price);
    return this.formatMotorcycleMessage(
      `🆕 <b>New Motorcycle Available</b>`,
      motorcycle,
      `💰 Price: ${price}\n`
    );
  }

  private formatPriceUpdateMessage(
    motorcycle: StoredMotorcycle,
    oldPrice: number
  ): { text: string; url: string } {
    const newPrice = this.formatPrice(motorcycle.price);
    const oldPriceFormatted = this.formatPrice(oldPrice);
    const difference = motorcycle.price - oldPrice;
    const diffFormatted = this.formatPrice(Math.abs(difference));
    const direction = difference > 0 ? '📈' : '📉';
    const changeType = difference > 0 ? 'increased' : 'decreased';

    const priceInfo = `💰 Old Price: ${oldPriceFormatted}\n` +
      `💰 New Price: ${newPrice}\n` +
      `📊 Price ${changeType} by: ${diffFormatted}\n`;

    return this.formatMotorcycleMessage(
      `${direction} <b>Price Update</b>`,
      motorcycle,
      priceInfo
    );
  }

  private formatPrice(price: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  }
}

