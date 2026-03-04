import { Module } from '@nestjs/common';
import { PartnerController } from './partner.controller';
import { PartnerService } from './partner.service';

@Module({
  imports: [],
  controllers: [PartnerController],
  providers: [PartnerService],
})
export class PartnerModule {}
