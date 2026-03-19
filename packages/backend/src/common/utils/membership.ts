import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { NOT_MEMBER_OF_ACCOUNT } from '@/common/constants';

/**
 * Check if user is a signer of the account. Throws ForbiddenException if not.
 * @param prisma - PrismaService instance
 * @param accountLookup - Either { accountId } or { accountAddress } to identify the account
 * @param userCommitment - User's commitment string
 */
export async function checkAccountMembership(
  prisma: PrismaService,
  accountLookup: { accountId: string } | { accountAddress: string },
  userCommitment: string,
): Promise<void> {
  const accountWhere =
    'accountId' in accountLookup
      ? { id: accountLookup.accountId }
      : { address: accountLookup.accountAddress };

  const membership = await prisma.accountSigner.findFirst({
    where: {
      account: accountWhere,
      user: { commitment: userCommitment },
    },
  });

  if (!membership) {
    throw new ForbiddenException(NOT_MEMBER_OF_ACCOUNT);
  }
}
