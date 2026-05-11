import { Module } from '@nestjs/common';
import { StealthController } from './stealth.controller';
import { StealthService } from './stealth.service';

@Module({
  controllers: [StealthController],
  providers: [StealthService],
})
export class StealthModule {}
