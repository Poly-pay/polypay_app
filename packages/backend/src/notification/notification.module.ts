import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { EventsModule } from '@/events/events.module';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
