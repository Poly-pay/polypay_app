import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class WalletMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userCommitment = request.user?.commitment;
    const walletAddress = request.params?.address;

    if (!userCommitment) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!walletAddress) {
      throw new ForbiddenException('Wallet address not provided');
    }

    // Check if user is a member of the wallet
    const membership = await this.prisma.accountWallet.findFirst({
      where: {
        wallet: { address: walletAddress },
        account: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this wallet');
    }

    return true;
  }
}
