import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import axiosRetry from 'axios-retry';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';
import { PriceScheduler } from './price.scheduler';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
    }),
    CacheModule.register({
      ttl: 5 * 60 * 1000, // 5 minutes
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
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          error.response?.status === 429
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
