import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import axiosRetry from 'axios-retry';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';
import { PriceScheduler } from './price.scheduler';
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
  providers: [PriceService, PriceScheduler],
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
