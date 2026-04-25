import { Module } from '@nestjs/common';
import { X402Controller } from './x402.controller';
import { X402Service } from './x402.service';
import { Eip712DomainCacheService } from './eip712-domain-cache.service';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [X402Controller],
  providers: [X402Service, Eip712DomainCacheService],
})
export class X402Module {}
