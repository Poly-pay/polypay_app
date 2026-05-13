import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
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

    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
      select: { accountAddress: true, chainId: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Scope membership by both address AND chainId — the same address can
    // live on multiple chains, and only the signer of the exact multisig
    // (this transaction's chain) should be allowed access.
    const membership = await this.prisma.accountSigner.findFirst({
      where: {
        account: {
          address: transaction.accountAddress,
          chainId: transaction.chainId,
        },
        user: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException(NOT_MEMBER_OF_ACCOUNT);
    }

    return true;
  }
}
