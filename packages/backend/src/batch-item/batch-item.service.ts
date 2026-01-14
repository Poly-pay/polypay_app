import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateBatchItemDto, UpdateBatchItemDto } from '@polypay/shared';

@Injectable()
export class BatchItemService {
  private readonly logger = new Logger(BatchItemService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create new batch item
   */
  async create(dto: CreateBatchItemDto, userCommitment: string) {
    // Find user by commitment
    const user = await this.prisma.user.findUnique({
      where: { commitment: userCommitment },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const batchItem = await this.prisma.batchItem.create({
      data: {
        userId: user.id,
        recipient: dto.recipient,
        amount: dto.amount,
        tokenAddress: dto.tokenAddress,
        contactId: dto.contactId,
      },
      include: {
        contact: true,
      },
    });

    this.logger.log(`Created batch item: ${batchItem.id}`);
    return batchItem;
  }

  /**
   * Get all batch items for account
   */
  async findByCommitment(commitment: string) {
    const user = await this.prisma.user.findUnique({
      where: { commitment },
      include: {
        batchItems: {
          include: { contact: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return user?.batchItems || [];
  }

  /**
   * Update batch item
   */
  async update(id: string, dto: UpdateBatchItemDto) {
    const batchItem = await this.prisma.batchItem.findUnique({
      where: { id },
    });

    if (!batchItem) {
      throw new NotFoundException(`Batch item ${id} not found`);
    }

    return this.prisma.batchItem.update({
      where: { id },
      data: dto,
      include: {
        contact: true,
      },
    });
  }

  /**
   * Delete batch item
   */
  async delete(id: string) {
    const batchItem = await this.prisma.batchItem.findUnique({
      where: { id },
    });

    if (!batchItem) {
      throw new NotFoundException(`Batch item ${id} not found`);
    }

    await this.prisma.batchItem.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Clear all batch items for account
   */
  async clearByCommitment(commitment: string) {
    const user = await this.prisma.user.findUnique({
      where: { commitment },
    });

    if (!user) {
      return { deleted: 0 };
    }

    const result = await this.prisma.batchItem.deleteMany({
      where: { userId: user.id },
    });

    this.logger.log(`Cleared ${result.count} batch items for ${commitment}`);
    return { deleted: result.count };
  }

  /**
   * Get batch items by IDs (for creating batch tx)
   */
  async findByIds(ids: string[]) {
    return this.prisma.batchItem.findMany({
      where: { id: { in: ids } },
      include: { contact: true },
    });
  }
}
