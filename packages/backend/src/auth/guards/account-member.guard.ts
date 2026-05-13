import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
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
    const chainIdRaw = request.query?.chainId;

    if (!userCommitment) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!accountAddress) {
      throw new ForbiddenException('Account address not provided');
    }

    // chainId is mandatory: the same address can exist on multiple chains
    // (same relayer + same nonce on Horizen vs Base). Without scoping the
    // lookup by chainId, a signer of one account could trick the guard into
    // letting them act on a different account that happens to share its
    // address.
    const chainId = Number.parseInt(String(chainIdRaw ?? ''), 10);
    if (!Number.isFinite(chainId) || chainId <= 0) {
      throw new BadRequestException(
        'chainId query parameter is required (e.g. ?chainId=8453)',
      );
    }

    const membership = await this.prisma.accountSigner.findFirst({
      where: {
        account: { address: accountAddress, chainId },
        user: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException(NOT_MEMBER_OF_ACCOUNT);
    }

    return true;
  }
}
