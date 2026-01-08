import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { NOT_MEMBER_OF_ACCOUNT } from '@/common/constants';

@Injectable()
export class AccountMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userCommitment = request.user?.commitment;
    const accountAddress = request.params?.address;

    if (!userCommitment) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!accountAddress) {
      throw new ForbiddenException('Account address not provided');
    }

    // Check if user is a member of the wallet
    const membership = await this.prisma.accountSigner.findFirst({
      where: {
        account: { address: accountAddress },
        user: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException(NOT_MEMBER_OF_ACCOUNT);
    }

    return true;
  }
}
