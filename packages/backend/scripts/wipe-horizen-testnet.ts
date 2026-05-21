/**
 * One-off cleanup: wipe all PolyPay data tied to Horizen testnet
 * (chainId 2651420) so accounts created against the old zkVerify contract
 * stop showing up after the contract address migration.
 *
 * Run: yarn wipe:horizen-testnet
 * GCP job command: cd packages/backend && yarn install --frozen-lockfile && yarn wipe:horizen-testnet
 *
 * Safety:
 *  - Refuses to run when APP_NETWORK=mainnet (wrong environment).
 *  - Wraps deletions in a single Prisma transaction; either all rows go
 *    or none do, so a partial run can't leave the DB in a half-wiped state.
 *  - User accounts, login_history, notifications, and batch_items are
 *    intentionally preserved — they're not tied to a specific chain and
 *    deleting them would log users out / drop unrelated state.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const HORIZEN_TESTNET_CHAIN_ID = 2651420;
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  if (process.env.APP_NETWORK === 'mainnet') {
    throw new Error(
      'Refusing to run: APP_NETWORK=mainnet. This script only targets Horizen testnet data.',
    );
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  const chainId = HORIZEN_TESTNET_CHAIN_ID;

  console.log(
    `[wipe-horizen-testnet] mode=${DRY_RUN ? 'DRY-RUN' : 'DELETE'} chainId=${chainId}`,
  );

  try {
    const accounts = await prisma.account.findMany({
      where: { chainId },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);

    const contacts = accountIds.length
      ? await prisma.contact.findMany({
          where: { accountId: { in: accountIds } },
          select: { id: true },
        })
      : [];
    const contactIds = contacts.map((c) => c.id);

    const txIds = (
      await prisma.transaction.findMany({
        where: { chainId },
        select: { txId: true },
      })
    ).map((t) => t.txId);

    const voteCount = txIds.length
      ? await prisma.vote.count({ where: { txId: { in: txIds } } })
      : 0;
    const signerCount = accountIds.length
      ? await prisma.accountSigner.count({
          where: { accountId: { in: accountIds } },
        })
      : 0;
    const reservedNonceCount = await prisma.reservedNonce.count({
      where: { chainId },
    });
    const batchItemRefCount = contactIds.length
      ? await prisma.batchItem.count({
          where: { contactId: { in: contactIds } },
        })
      : 0;

    console.log('[wipe-horizen-testnet] candidates', {
      accounts: accountIds.length,
      contacts: contactIds.length,
      transactions: txIds.length,
      votes: voteCount,
      account_signers: signerCount,
      reserved_nonces: reservedNonceCount,
      batch_items_to_unlink: batchItemRefCount,
    });

    if (DRY_RUN) {
      console.log('[wipe-horizen-testnet] dry-run, no rows deleted.');
      return;
    }

    if (accountIds.length === 0 && txIds.length === 0 && reservedNonceCount === 0) {
      console.log('[wipe-horizen-testnet] nothing to delete, exiting.');
      return;
    }

    await prisma.$transaction(async (tx) => {
      // BatchItem.contact has no onDelete cascade — Postgres will reject the
      // Account delete (which cascades Contact) if any batch item still
      // points to a contact we're about to remove. Null the link first.
      if (contactIds.length) {
        const { count } = await tx.batchItem.updateMany({
          where: { contactId: { in: contactIds } },
          data: { contactId: null },
        });
        console.log(`[wipe] unlinked batch_items.contactId: ${count}`);
      }

      if (txIds.length) {
        const { count } = await tx.vote.deleteMany({
          where: { txId: { in: txIds } },
        });
        console.log(`[wipe] deleted votes: ${count}`);
      }

      {
        const { count } = await tx.transaction.deleteMany({
          where: { chainId },
        });
        console.log(`[wipe] deleted transactions: ${count}`);
      }

      if (accountIds.length) {
        const { count } = await tx.accountSigner.deleteMany({
          where: { accountId: { in: accountIds } },
        });
        console.log(`[wipe] deleted account_signers: ${count}`);
      }

      {
        const { count } = await tx.reservedNonce.deleteMany({
          where: { chainId },
        });
        console.log(`[wipe] deleted reserved_nonces: ${count}`);
      }

      // Account deletion cascades Contact, ContactGroup, ContactGroupEntry.
      {
        const { count } = await tx.account.deleteMany({ where: { chainId } });
        console.log(`[wipe] deleted accounts (cascades contacts/groups): ${count}`);
      }
    });

    console.log('[wipe-horizen-testnet] done.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[wipe-horizen-testnet] fatal', err);
  process.exit(1);
});
