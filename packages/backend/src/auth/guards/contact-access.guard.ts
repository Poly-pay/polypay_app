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
export class ContactAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userCommitment = request.user?.commitment;
    const contactId = request.params?.id;

    if (!userCommitment) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!contactId) {
      throw new ForbiddenException('Contact ID not provided');
    }

    // Find contact and its account
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      include: { account: true },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Check if user is a member of the account
    const membership = await this.prisma.accountSigner.findFirst({
      where: {
        account: { id: contact.accountId },
        user: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException(NOT_MEMBER_OF_ACCOUNT);
    }

    return true;
  }
}
