import { Module } from '@nestjs/common';
import { LlmsTxtController } from './llms-txt.controller';
import { LlmsTxtService } from './llms-txt.service';

@Module({
  controllers: [LlmsTxtController],
  providers: [LlmsTxtService],
  exports: [LlmsTxtService],
})
export class LlmsTxtModule {}
