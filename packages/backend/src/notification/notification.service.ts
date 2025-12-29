import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { SendCommitmentDto, NotificationType } from '@polypay/shared';
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

    // Find sender account
    const sender = await this.prisma.account.findUnique({
      where: { commitment: senderCommitment },
    });

    if (!sender) {
      throw new NotFoundException('Sender account not found');
    }

    // Find recipient account
    const recipient = await this.prisma.account.findUnique({
      where: { commitment: recipientCommitment },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient account not found');
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
      'notification:new',
      notification,
    );

    return notification;
  }

  async getByRecipient(commitment: string) {
    const account = await this.prisma.account.findUnique({
      where: { commitment },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.prisma.notification.findMany({
      where: { recipientId: account.id },
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
    const account = await this.prisma.account.findUnique({
      where: { commitment },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.prisma.notification.updateMany({
      where: {
        recipientId: account.id,
        read: false,
      },
      data: { read: true },
    });
  }

  async getUnreadCount(commitment: string) {
    const account = await this.prisma.account.findUnique({
      where: { commitment },
    });

    if (!account) {
      return 0;
    }

    return this.prisma.notification.count({
      where: {
        recipientId: account.id,
        read: false,
      },
    });
  }
}
