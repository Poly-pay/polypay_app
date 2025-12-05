import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ZkVerifyController } from './zkverify.controller';
import { ZkVerifyService } from './zkverify.service';

@Module({
  imports: [ConfigModule],
  controllers: [ZkVerifyController],
  providers: [ZkVerifyService],
  exports: [ZkVerifyService],
})
export class ZkVerifyModule {}