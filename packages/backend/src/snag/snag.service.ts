import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CONFIG_KEYS } from '@/config/config.keys';
import { firstValueFrom } from 'rxjs';

const SNAG_BASE_URL = 'https://zenrise.horizen.io';

@Injectable()
export class SnagService {
  private readonly logger = new Logger(SnagService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Notify Snag Solutions that a user completed a loyalty rule.
   * Fire-and-forget: errors are logged but never block the caller.
   */
  async completeRule(
    walletAddress: string,
    idempotencyKey: string,
  ): Promise<void> {
    const apiKey = this.configService.get<string>(CONFIG_KEYS.SNAG_API_KEY);
    const ruleId = this.configService.get<string>(CONFIG_KEYS.SNAG_RULE_ID);

    if (!apiKey || !ruleId) {
      this.logger.warn(
        'Snag API key or rule ID not configured, skipping rule completion',
      );
      return;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ message: string }>(
          `${SNAG_BASE_URL}/api/loyalty/rules/${ruleId}/complete`,
          { walletAddress, idempotencyKey },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': apiKey,
            },
          },
        ),
      );

      this.logger.log(
        `Snag rule completion for ${walletAddress}: ${response.data?.message}`,
      );
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const status = axiosError.response?.status;
      const message = axiosError.response?.data?.message ?? axiosError.message;
      this.logger.error(
        `Snag rule completion failed for ${walletAddress} (${status}): ${message}`,
      );
    }
  }
}
