import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { NOT_MEMBER_OF_ACCOUNT } from '@/common/constants';

@Injectable()
export class TransactionAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userCommitment = request.user?.commitment;
    const txId = parseInt(request.params?.txId, 10);

    if (!userCommitment) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!txId || isNaN(txId)) {
      throw new ForbiddenException('Transaction ID not provided');
    }

    // Find transaction and its wallet
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
      include: { account: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Check if user is a member of the wallet
    const membership = await this.prisma.accountSigner.findFirst({
      where: {
        account: { address: transaction.account.address },
        user: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException(NOT_MEMBER_OF_ACCOUNT);
    }

    return true;
  }
}
