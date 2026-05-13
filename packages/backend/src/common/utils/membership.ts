import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { NOT_MEMBER_OF_ACCOUNT } from '@/common/constants';

/**
 * Check if user is a signer of the account. Throws ForbiddenException if not.
 *
 * Account lookup MUST be precise: either `accountId` (a CUID) or the composite
 * `{ accountAddress, chainId }`. Using address alone is unsafe — the same
 * address can exist on multiple chains, so an address-only check could match
 * a signer of a different multisig that happens to share the address.
 */
export async function checkAccountMembership(
  prisma: PrismaService,
  accountLookup:
    | { accountId: string }
    | { accountAddress: string; chainId: number },
  userCommitment: string,
): Promise<void> {
  const accountWhere =
    'accountId' in accountLookup
      ? { id: accountLookup.accountId }
      : {
          address: accountLookup.accountAddress,
          chainId: accountLookup.chainId,
        };

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
