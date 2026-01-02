import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

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
      include: { wallet: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Check if user is a member of the wallet
    const membership = await this.prisma.accountWallet.findFirst({
      where: {
        wallet: { address: transaction.wallet.address },
        account: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this wallet');
    }

    return true;
  }
}
