import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

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

    // Find contact and its wallet
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      include: { wallet: true },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Check if user is a member of the wallet
    const membership = await this.prisma.accountWallet.findFirst({
      where: {
        wallet: { id: contact.walletId },
        account: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this wallet');
    }

    return true;
  }
}
