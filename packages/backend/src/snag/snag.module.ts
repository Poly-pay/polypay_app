import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SnagService } from './snag.service';

@Module({
  imports: [HttpModule.register({ timeout: 10_000 })],
  providers: [SnagService],
  exports: [SnagService],
})
export class SnagModule {}
