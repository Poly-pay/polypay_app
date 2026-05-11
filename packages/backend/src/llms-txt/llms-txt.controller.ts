import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { LlmsTxtService } from './llms-txt.service';

@ApiExcludeController()
@Controller()
export class LlmsTxtController {
  constructor(private readonly service: LlmsTxtService) {}

  @Get('llms.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Cache-Control', 'public, max-age=3600')
  getIndex(): string {
    return this.service.getIndex();
  }

  @Get('llms-full.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Cache-Control', 'public, max-age=3600')
  getFull(): string {
    return this.service.getFull();
  }
}
