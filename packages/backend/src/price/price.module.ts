import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import axiosRetry from 'axios-retry';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';
// Weekly ZEN price capture only fed the Quest/Reward payout flow, which is
// disabled. Keep price.scheduler.ts for future reuse but leave it unregistered
// so its Friday cron stops running. Re-add PriceScheduler below to re-enable.
// import { PriceScheduler } from './price.scheduler';
import {
  HTTP_TIMEOUT_PRICE,
  PRICE_CACHE_TTL,
  PRICE_API_RETRY_ATTEMPTS,
  HTTP_STATUS_RATE_LIMIT,
} from '@/common/constants/timing';

@Module({
  imports: [
    HttpModule.register({
      timeout: HTTP_TIMEOUT_PRICE,
    }),
    CacheModule.register({
      ttl: PRICE_CACHE_TTL,
    }),
  ],
  controllers: [PriceController],
  providers: [PriceService],
  exports: [PriceService],
})
export class PriceModule {
  constructor(private httpService: HttpService) {
    // Configure axios-retry
    axiosRetry(this.httpService.axiosRef, {
      retries: PRICE_API_RETRY_ATTEMPTS,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          error.response?.status === HTTP_STATUS_RATE_LIMIT
        );
      },
      onRetry: (retryCount, error) => {
        console.warn(
          `Retry attempt ${retryCount} for CoinGecko API: ${error.message}`,
        );
      },
    });
  }
}
