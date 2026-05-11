import { Injectable, Logger } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { LlmsTxtGenerator } from './llms-txt.generator';

@Injectable()
export class LlmsTxtService {
  private readonly logger = new Logger(LlmsTxtService.name);
  private indexCache: string | null = null;
  private fullCache: string | null = null;

  initialize(document: OpenAPIObject, options: { apiPrefix: string }): void {
    const generator = new LlmsTxtGenerator(document, {
      apiPrefix: options.apiPrefix,
      // Hide internal-only or currently-unused tags from the agent surface.
      excludedTags: ['admin', 'notifications'],
    });
    this.indexCache = generator.generateIndex();
    this.fullCache = generator.generateFull();
    this.logger.log(
      `Generated llms.txt (${this.indexCache.length} bytes) and llms-full.txt (${this.fullCache.length} bytes)`,
    );
  }

  getIndex(): string {
    if (!this.indexCache) {
      throw new Error(
        'LlmsTxtService not initialized. Call initialize() during bootstrap.',
      );
    }
    return this.indexCache;
  }

  getFull(): string {
    if (!this.fullCache) {
      throw new Error(
        'LlmsTxtService not initialized. Call initialize() during bootstrap.',
      );
    }
    return this.fullCache;
  }
}
