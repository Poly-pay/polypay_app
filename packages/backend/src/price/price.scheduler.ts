import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PriceService } from './price.service';
import { CAMPAIGN_START, TOTAL_CAMPAIGN_WEEKS } from '@polypay/shared';

@Injectable()
export class PriceScheduler {
  private readonly logger = new Logger(PriceScheduler.name);

  constructor(private priceService: PriceService) {}

  /**
   * Run every Friday at 11:00 UTC (1 hour before week ends)
   * Captures ZEN price for the week that is about to end
   */
  @Cron('0 11 * * 5', { timeZone: 'UTC' })
  async captureWeeklyPrice() {
    this.logger.log('Running weekly ZEN price capture job');

    const now = new Date();
    const diffMs = now.getTime() - CAMPAIGN_START.getTime();

    // Campaign hasn't started yet
    if (diffMs < 0) {
      this.logger.log('Campaign has not started yet, skipping');
      return;
    }

    // Calculate current week (the week that is about to end)
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(diffDays / 7) + 1;

    // Campaign has ended
    if (currentWeek > TOTAL_CAMPAIGN_WEEKS) {
      this.logger.log('Campaign has ended, skipping');
      return;
    }

    // Capture price for current week (which ends in 1 hour)
    this.logger.log(`Capturing price for week ${currentWeek} (ends in 1 hour)`);
    await this.priceService.captureWeeklyZenPrice(currentWeek);
  }
}
