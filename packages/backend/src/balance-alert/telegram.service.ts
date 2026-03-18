import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string | undefined;
  private readonly chatId: string | undefined;
  private readonly maxRetries = 3;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegram.botToken');
    this.chatId = this.configService.get<string>('telegram.chatId');

    if (!this.botToken || !this.chatId) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set. Telegram alerts are disabled.',
      );
    }
  }

  async sendMessage(message: string): Promise<void> {
    if (!this.botToken || !this.chatId) {
      this.logger.warn('Telegram not configured, skipping alert');
      return;
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text: message,
            parse_mode: 'HTML',
          }),
        });

        if (response.ok) {
          this.logger.log('Telegram alert sent successfully');
          return;
        }

        const body = await response.text();
        const status = response.status;

        // Don't retry on 4xx errors (except 429 rate limit) — these are config issues
        if (status >= 400 && status < 500 && status !== 429) {
          this.logger.error(
            `Telegram API error (${status}), not retrying: ${body}`,
          );
          return;
        }

        throw new Error(`Telegram API error: ${status} - ${body}`);
      } catch (error) {
        this.logger.error(
          `Failed to send Telegram alert (attempt ${attempt}/${this.maxRetries}): ${error.message}`,
        );

        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          this.logger.log(`Retrying in ${delay / 1000}s...`);
          await this.sleep(delay);
        } else {
          this.logger.error(
            `All ${this.maxRetries} attempts failed. Telegram alert not sent.`,
          );
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
