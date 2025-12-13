import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateBatchItemDto, UpdateBatchItemDto } from '@polypay/shared';

@Injectable()
export class BatchItemService {
  private readonly logger = new Logger(BatchItemService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create new batch item
   */
  async create(dto: CreateBatchItemDto) {
    const account = await this.prisma.account.upsert({
      where: { commitment: dto.commitment },
      create: { commitment: dto.commitment },
      update: {},
    });

    const batchItem = await this.prisma.batchItem.create({
      data: {
        accountId: account.id,
        recipient: dto.recipient,
        amount: dto.amount,
      },
    });

    this.logger.log(`Created batch item: ${batchItem.id}`);
    return batchItem;
  }

  /**
   * Get all batch items for account
   */
  async findByCommitment(commitment: string) {
    const account = await this.prisma.account.findUnique({
      where: { commitment },
      include: { batchItems: { orderBy: { createdAt: 'desc' } } },
    });

    return account?.batchItems || [];
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
    const account = await this.prisma.account.findUnique({
      where: { commitment },
    });

    if (!account) {
      return { deleted: 0 };
    }

    const result = await this.prisma.batchItem.deleteMany({
      where: { accountId: account.id },
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
    });
  }
}
