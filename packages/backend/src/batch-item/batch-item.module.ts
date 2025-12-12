import { Module } from '@nestjs/common';
import { BatchItemController } from './batch-item.controller';
import { BatchItemService } from './batch-item.service';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BatchItemController],
  providers: [BatchItemService],
  exports: [BatchItemService],
})
export class BatchItemModule {}
