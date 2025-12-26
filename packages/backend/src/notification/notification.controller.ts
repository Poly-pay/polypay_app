import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SendCommitmentDto } from '@polypay/shared';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send-commitment')
  sendCommitment(@Body() dto: SendCommitmentDto) {
    return this.notificationService.sendCommitment(dto);
  }

  @Get()
  getNotifications(@Query('commitment') commitment: string) {
    return this.notificationService.getByRecipient(commitment);
  }

  @Get('unread-count')
  getUnreadCount(@Query('commitment') commitment: string) {
    return this.notificationService.getUnreadCount(commitment);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Patch('read-all')
  markAllAsRead(@Body('commitment') commitment: string) {
    return this.notificationService.markAllAsRead(commitment);
  }
}
