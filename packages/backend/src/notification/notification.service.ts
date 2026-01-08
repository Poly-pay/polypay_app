import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import {
  SendCommitmentDto,
  NotificationType,
  NOTIFICATION_NEW_EVENT,
} from '@polypay/shared';
import { EventsService } from '@/events/events.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async sendCommitment(dto: SendCommitmentDto) {
    const { senderCommitment, recipientCommitment } = dto;

    // Validate: cannot send to self
    if (senderCommitment === recipientCommitment) {
      throw new BadRequestException('Cannot send commitment to yourself');
    }

    // Find sender user
    const sender = await this.prisma.user.findUnique({
      where: { commitment: senderCommitment },
    });

    if (!sender) {
      throw new NotFoundException('Sender user not found');
    }

    // Find recipient user
    const recipient = await this.prisma.user.findUnique({
      where: { commitment: recipientCommitment },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient user not found');
    }

    // Create notification
    const notification = await this.prisma.notification.create({
      data: {
        senderId: sender.id,
        recipientId: recipient.id,
        type: NotificationType.COMMITMENT_RECEIVED,
      },
      include: {
        sender: true,
      },
    });

    this.logger.log(
      `Commitment sent from ${senderCommitment.slice(0, 10)}... to ${recipientCommitment.slice(0, 10)}...`,
    );

    // Emit realtime event to recipient
    this.eventsService.emitToUser(
      recipientCommitment,
      NOTIFICATION_NEW_EVENT,
      notification,
    );

    return notification;
  }

  async getByRecipient(commitment: string) {
    const user = await this.prisma.user.findUnique({
      where: { commitment },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.notification.findMany({
      where: { recipientId: user.id },
      include: { sender: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(commitment: string) {
    const user = await this.prisma.user.findUnique({
      where: { commitment },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.notification.updateMany({
      where: {
        recipientId: user.id,
        read: false,
      },
      data: { read: true },
    });
  }

  async getUnreadCount(commitment: string) {
    const user = await this.prisma.user.findUnique({
      where: { commitment },
    });

    if (!user) {
      return 0;
    }

    return this.prisma.notification.count({
      where: {
        recipientId: user.id,
        read: false,
      },
    });
  }
}
