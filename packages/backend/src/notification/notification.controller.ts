import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { SendCommitmentDto } from '@polypay/shared';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send-commitment')
  @ApiOperation({ summary: 'Send a commitment notification' })
  @ApiBody({ type: SendCommitmentDto })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  sendCommitment(@Body() dto: SendCommitmentDto) {
    return this.notificationService.sendCommitment(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications for a commitment' })
  @ApiQuery({
    name: 'commitment',
    required: true,
    description: 'Account commitment hash',
  })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  getNotifications(@Query('commitment') commitment: string) {
    return this.notificationService.getByRecipient(commitment);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiQuery({
    name: 'commitment',
    required: true,
    description: 'Account commitment hash',
  })
  @ApiResponse({ status: 200, description: 'Unread count' })
  getUnreadCount(@Query('commitment') commitment: string) {
    return this.notificationService.getUnreadCount(commitment);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for a commitment' })
  @ApiBody({
    schema: { type: 'object', properties: { commitment: { type: 'string' } } },
  })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllAsRead(@Body('commitment') commitment: string) {
    return this.notificationService.markAllAsRead(commitment);
  }
}
