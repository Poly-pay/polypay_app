import { Injectable, Logger } from '@nestjs/common';
import { buildLlmsTxt } from './llms-txt.content';

@Injectable()
export class LlmsTxtService {
  private readonly logger = new Logger(LlmsTxtService.name);
  private readonly content: string;

  constructor() {
    // Content is static — build once at boot, serve from memory.
    this.content = buildLlmsTxt();
    this.logger.log(`Loaded llms.txt (${this.content.length} bytes)`);
  }

  get(): string {
    return this.content;
  }
}
