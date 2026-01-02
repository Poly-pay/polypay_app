import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class AddressGroupAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userCommitment = request.user?.commitment;
    const groupId = request.params?.id;

    if (!userCommitment) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!groupId) {
      throw new ForbiddenException('Group ID not provided');
    }

    // Find group and its wallet
    const group = await this.prisma.addressGroup.findUnique({
      where: { id: groupId },
      include: { wallet: true },
    });

    if (!group) {
      throw new NotFoundException('Address group not found');
    }

    // Check if user is a member of the wallet
    const membership = await this.prisma.accountWallet.findFirst({
      where: {
        wallet: { id: group.walletId },
        account: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this wallet');
    }

    return true;
  }
}
