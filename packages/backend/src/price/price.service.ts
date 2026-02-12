import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { getCoingeckoIds } from '@polypay/shared';
import { ZEN_COINGECKO_ID } from '@/common/constants';

export interface TokenPrices {
  [coingeckoId: string]: number;
}

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private readonly CACHE_KEY = 'token-prices';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly COINGECKO_API =
    'https://api.coingecko.com/api/v3/simple/price';

  constructor(
    private httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getPrices(): Promise<TokenPrices> {
    // Check cache
    const cached = await this.cacheManager.get<TokenPrices>(this.CACHE_KEY);
    if (cached) {
      this.logger.debug('Returning cached prices');
      return cached;
    }

    // Fetch fresh prices
    return this.fetchPrices();
  }

  /**
   * Get ZEN price in USD
   */
  async getZenPrice(): Promise<number> {
    const prices = await this.getPrices();
    return prices[ZEN_COINGECKO_ID] || 0;
  }

  private async fetchPrices(): Promise<TokenPrices> {
    try {
      // Get all token IDs from shared
      const ids = getCoingeckoIds().join(',');

      const url = `${this.COINGECKO_API}?ids=${ids}&vs_currencies=usd`;

      this.logger.log(`Fetching prices from CoinGecko: ${ids}`);

      const { data } = await firstValueFrom(this.httpService.get(url));

      // Format: { "ethereum": { "usd": 3500 } } -> { "ethereum": 3500 }
      const prices: TokenPrices = {};
      for (const [id, priceData] of Object.entries(data)) {
        prices[id] = (priceData as { usd: number }).usd;
      }

      // Update cache
      await this.cacheManager.set(this.CACHE_KEY, prices, this.CACHE_TTL);

      this.logger.log(`Prices updated: ${JSON.stringify(prices)}`);

      return prices;
    } catch (error) {
      this.logger.error(`Failed to fetch prices: ${error.message}`);

      // Return cached prices if available (even if expired)
      const staleCache = await this.cacheManager.get<TokenPrices>(
        this.CACHE_KEY,
      );
      if (staleCache) {
        this.logger.warn('Returning stale cached prices');
        return staleCache;
      }

      throw error;
    }
  }
}
