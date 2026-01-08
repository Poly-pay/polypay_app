import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class BatchItemOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userCommitment = request.user?.commitment;
    const batchItemId = request.params?.id;

    if (!userCommitment) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!batchItemId) {
      throw new ForbiddenException('Batch item ID not provided');
    }

    // Find batch item
    const batchItem = await this.prisma.batchItem.findUnique({
      where: { id: batchItemId },
      include: { user: true },
    });

    if (!batchItem) {
      throw new NotFoundException('Batch item not found');
    }

    // Check if user owns this batch item
    if (batchItem.user.commitment !== userCommitment) {
      throw new ForbiddenException('You do not own this batch item');
    }

    return true;
  }
}
