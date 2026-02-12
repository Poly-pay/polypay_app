import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { getCoingeckoIds } from '@polypay/shared';
import { ZEN_COINGECKO_ID } from '@/common/constants';
import { PrismaService } from '@/database/prisma.service';

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
    private prisma: PrismaService,
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
      // Get token IDs from shared + add ZEN
      const sharedIds = getCoingeckoIds();
      const allIds = [...new Set([...sharedIds, ZEN_COINGECKO_ID])];
      const ids = allIds.join(',');

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

  /**
   * Get ZEN price for a specific week
   * Falls back to realtime price if not found in DB
   */
  async getZenPriceForWeek(week: number): Promise<number> {
    // Try to get from DB first
    const weeklyPrice = await this.prisma.weeklyZenPrice.findUnique({
      where: { week },
    });

    if (weeklyPrice) {
      this.logger.debug(
        `Using fixed ZEN price for week ${week}: ${weeklyPrice.price}`,
      );
      return weeklyPrice.price;
    }

    // Fallback to realtime price
    this.logger.warn(
      `No fixed price for week ${week}, falling back to realtime`,
    );
    return this.getZenPrice();
  }

  /**
   * Capture and store ZEN price for a specific week
   * Retries up to 10 times with 5s delay on failure
   */
  async captureWeeklyZenPrice(week: number): Promise<boolean> {
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 5000; // 5 seconds

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        this.logger.log(
          `Capturing ZEN price for week ${week}, attempt ${attempt}/${MAX_RETRIES}`,
        );

        // Fetch fresh price from CoinGecko
        const prices = await this.fetchPrices();
        const zenPrice = prices[ZEN_COINGECKO_ID];

        if (!zenPrice || zenPrice <= 0) {
          throw new Error('Invalid ZEN price received');
        }

        // Upsert to DB
        await this.prisma.weeklyZenPrice.upsert({
          where: { week },
          update: {
            price: zenPrice,
            capturedAt: new Date(),
          },
          create: {
            week,
            price: zenPrice,
            capturedAt: new Date(),
          },
        });

        this.logger.log(
          `Successfully captured ZEN price for week ${week}: $${zenPrice}`,
        );
        return true;
      } catch (error) {
        this.logger.error(
          `Attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`,
        );

        if (attempt < MAX_RETRIES) {
          this.logger.log(`Retrying in ${RETRY_DELAY / 1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }

    this.logger.error(
      `Failed to capture ZEN price for week ${week} after ${MAX_RETRIES} attempts`,
    );
    return false;
  }
}
