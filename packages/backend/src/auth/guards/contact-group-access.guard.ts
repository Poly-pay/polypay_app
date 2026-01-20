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
export class ContactGroupAccessGuard implements CanActivate {
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

    // Find group and its account
    const group = await this.prisma.contactGroup.findUnique({
      where: { id: groupId },
      include: { account: true },
    });

    if (!group) {
      throw new NotFoundException('Address group not found');
    }

    // Check if user is a member of the wallet
    const membership = await this.prisma.accountSigner.findFirst({
      where: {
        account: { id: group.accountId },
        user: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException(NOT_MEMBER_OF_ACCOUNT);
    }

    return true;
  }
}
