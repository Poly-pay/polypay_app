import { Module } from '@nestjs/common';
import { FeatureRequestController } from './feature-request.controller';
import { FeatureRequestService } from './feature-request.service';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [FeatureRequestController],
  providers: [FeatureRequestService],
  exports: [FeatureRequestService],
})
export class FeatureRequestModule {}
