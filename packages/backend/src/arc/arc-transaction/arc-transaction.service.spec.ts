import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodePacked, keccak256 } from 'viem';
import { ArcTransactionService } from './arc-transaction.service';
import { PrismaService } from '@/database/prisma.service';
import { RelayerService } from '@/relayer-wallet/relayer-wallet.service';

const ARC_CHAIN_ID = 5042002;
const WALLET = `0x${'a'.repeat(40)}`;

async function signArcTx(
  signer: ReturnType<typeof privateKeyToAccount>,
  nonce: number,
  to: string,
  value: string,
  data: string,
) {
  const txHash = keccak256(
    encodePacked(
      ['address', 'uint256', 'uint256', 'address', 'uint256', 'bytes'],
      [
        WALLET as `0x${string}`,
        BigInt(ARC_CHAIN_ID),
        BigInt(nonce),
        to as `0x${string}`,
        BigInt(value),
        data as `0x${string}`,
      ],
    ),
  );
  return signer.signMessage({ message: { raw: txHash } });
}

// Minimal in-memory Prisma mock covering only the models/methods
// ArcTransactionService touches: account.findUnique, transaction.findFirst/
// findMany/findUnique/create/update, vote.create/findUnique/count,
// $transaction passthrough.
function makePrismaMock(account: {
  id: string;
  address: string;
  chainId: number;
  chainType: string;
  threshold: number;
  signers: { address: string }[];
}) {
  let txSeq = 0;
  const transactions = new Map<number, any>();
  const votes: any[] = [];

  const prisma: any = {
    account: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id !== account.id) return null;
        return { ...account };
      }),
    },
    transaction: {
      findFirst: jest.fn(async ({ where, orderBy }: any) => {
        const rows = [...transactions.values()].filter(
          (t) =>
            t.accountAddress === where.accountAddress &&
            t.chainId === where.chainId,
        );
        if (rows.length === 0) return null;
        rows.sort((a, b) =>
          orderBy.nonce === 'desc' ? b.nonce - a.nonce : a.nonce - b.nonce,
        );
        return { nonce: rows[0].nonce };
      }),
      findUnique: jest.fn(async ({ where, include }: any) => {
        const tx = transactions.get(where.txId);
        if (!tx) return null;
        const result: any = { ...tx };
        if (include?.account) result.account = { ...account };
        if (include?.votes)
          result.votes = votes.filter((v) => v.txId === where.txId);
        return result;
      }),
      findMany: jest.fn(async ({ where, include, orderBy }: any) => {
        const rows = [...transactions.values()].filter(
          (t) =>
            t.accountAddress === where.accountAddress &&
            t.chainId === where.chainId,
        );
        rows.sort((a, b) =>
          orderBy.nonce === 'desc' ? b.nonce - a.nonce : a.nonce - b.nonce,
        );
        return rows.map((tx) => {
          const result: any = { ...tx };
          if (include?.votes)
            result.votes = votes.filter((v) => v.txId === tx.txId);
          return result;
        });
      }),
      create: jest.fn(async ({ data }: any) => {
        const tx = {
          id: `tx-${txSeq + 1}`,
          txId: ++txSeq,
          status: 'PENDING',
          ...data,
        };
        transactions.set(tx.txId, tx);
        return tx;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const tx = transactions.get(where.txId);
        Object.assign(tx, data);
        return tx;
      }),
    },
    vote: {
      create: jest.fn(async ({ data }: any) => {
        const vote = { id: `vote-${votes.length + 1}`, ...data };
        votes.push(vote);
        return vote;
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        const { txId, voterCommitment } = where.txId_voterCommitment;
        return (
          votes.find(
            (v) => v.txId === txId && v.voterCommitment === voterCommitment,
          ) ?? null
        );
      }),
      count: jest.fn(
        async ({ where }: any) =>
          votes.filter(
            (v) =>
              v.txId === where.txId &&
              (!where.voteType || v.voteType === where.voteType),
          ).length,
      ),
    },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };

  return prisma;
}

describe('ArcTransactionService', () => {
  let ownerA: ReturnType<typeof privateKeyToAccount>;
  let ownerB: ReturnType<typeof privateKeyToAccount>;
  let outsider: ReturnType<typeof privateKeyToAccount>;
  const to = `0x${'b'.repeat(40)}`;
  const value = '100';

  beforeEach(() => {
    ownerA = privateKeyToAccount(generatePrivateKey());
    ownerB = privateKeyToAccount(generatePrivateKey());
    outsider = privateKeyToAccount(generatePrivateKey());
  });

  function makeAccount(threshold: number) {
    return {
      id: 'account-1',
      address: WALLET,
      chainId: ARC_CHAIN_ID,
      chainType: 'ecdsa',
      threshold,
      signers: [{ address: ownerA.address }, { address: ownerB.address }],
    };
  }

  it('propose: an owner-signed proposal creates a Transaction + first Vote', async () => {
    const account = makeAccount(2);
    const prisma = makePrismaMock(account);
    const relayer = { executeArcTransaction: jest.fn() };
    const service = new ArcTransactionService(
      prisma as unknown as PrismaService,
      relayer as unknown as RelayerService,
    );

    const signature = await signArcTx(ownerA, 0, to, value, '0x');

    const res = await service.propose(
      { accountId: account.id, to, value, data: '0x', signature },
      ownerA.address.toLowerCase(),
    );

    expect(res.txId).toBe(1);
    expect(res.nonce).toBe(0);
    expect(prisma.vote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          voterCommitment: ownerA.address.toLowerCase(),
          signature,
        }),
      }),
    );
  });

  it('propose: a non-owner-signed proposal is rejected', async () => {
    const account = makeAccount(2);
    const prisma = makePrismaMock(account);
    const relayer = { executeArcTransaction: jest.fn() };
    const service = new ArcTransactionService(
      prisma as unknown as PrismaService,
      relayer as unknown as RelayerService,
    );

    const signature = await signArcTx(outsider, 0, to, value, '0x');

    await expect(
      service.propose(
        { accountId: account.id, to, value, data: '0x', signature },
        outsider.address.toLowerCase(),
      ),
    ).rejects.toThrow();
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('approve: dedupes by recovered signer address', async () => {
    const account = makeAccount(2);
    const prisma = makePrismaMock(account);
    const relayer = { executeArcTransaction: jest.fn() };
    const service = new ArcTransactionService(
      prisma as unknown as PrismaService,
      relayer as unknown as RelayerService,
    );

    const proposeSig = await signArcTx(ownerA, 0, to, value, '0x');
    await service.propose(
      { accountId: account.id, to, value, data: '0x', signature: proposeSig },
      ownerA.address.toLowerCase(),
    );

    const approveSig = await signArcTx(ownerB, 0, to, value, '0x');
    await service.approve(
      1,
      { signature: approveSig },
      ownerB.address.toLowerCase(),
    );

    await expect(
      service.approve(
        1,
        { signature: approveSig },
        ownerB.address.toLowerCase(),
      ),
    ).rejects.toThrow('Already voted');
  });

  it('execute: rejects when collected signatures are below threshold', async () => {
    const account = makeAccount(2);
    const prisma = makePrismaMock(account);
    const relayer = { executeArcTransaction: jest.fn() };
    const service = new ArcTransactionService(
      prisma as unknown as PrismaService,
      relayer as unknown as RelayerService,
    );

    const proposeSig = await signArcTx(ownerA, 0, to, value, '0x');
    await service.propose(
      { accountId: account.id, to, value, data: '0x', signature: proposeSig },
      ownerA.address.toLowerCase(),
    );

    await expect(service.execute(1)).rejects.toThrow('threshold not met');
    expect(relayer.executeArcTransaction).not.toHaveBeenCalled();
  });

  it('execute: calls the relayer once threshold is met and marks the transaction executed', async () => {
    const account = makeAccount(2);
    const prisma = makePrismaMock(account);
    const relayer = {
      executeArcTransaction: jest.fn().mockResolvedValue('0xTXHASH'),
    };
    const service = new ArcTransactionService(
      prisma as unknown as PrismaService,
      relayer as unknown as RelayerService,
    );

    const proposeSig = await signArcTx(ownerA, 0, to, value, '0x');
    await service.propose(
      { accountId: account.id, to, value, data: '0x', signature: proposeSig },
      ownerA.address.toLowerCase(),
    );
    const approveSig = await signArcTx(ownerB, 0, to, value, '0x');
    await service.approve(
      1,
      { signature: approveSig },
      ownerB.address.toLowerCase(),
    );

    const res = await service.execute(1);

    expect(relayer.executeArcTransaction).toHaveBeenCalledWith(
      WALLET,
      0,
      to,
      BigInt(value),
      '0x',
      [proposeSig, approveSig],
      ARC_CHAIN_ID,
    );
    expect(res.status).toBe('EXECUTED');
    expect(res.txHash).toBe('0xTXHASH');
  });

  it('getTransactions: rejects a caller who is not a signer of the account (IDOR)', async () => {
    const account = makeAccount(2);
    const prisma = makePrismaMock(account);
    const relayer = { executeArcTransaction: jest.fn() };
    const service = new ArcTransactionService(
      prisma as unknown as PrismaService,
      relayer as unknown as RelayerService,
    );

    await expect(
      service.getTransactions(account.id, outsider.address.toLowerCase()),
    ).rejects.toThrow('Caller is not a signer of this account');
  });

  it('getTransactions: allows a caller who is a signer of the account', async () => {
    const account = makeAccount(2);
    const prisma = makePrismaMock(account);
    const relayer = { executeArcTransaction: jest.fn() };
    const service = new ArcTransactionService(
      prisma as unknown as PrismaService,
      relayer as unknown as RelayerService,
    );

    await expect(
      service.getTransactions(account.id, ownerA.address.toLowerCase()),
    ).resolves.toEqual([]);
  });

  it('nextNonce: rejects a caller who is not a signer of the account (IDOR)', async () => {
    const account = makeAccount(2);
    const prisma = makePrismaMock(account);
    const relayer = { executeArcTransaction: jest.fn() };
    const service = new ArcTransactionService(
      prisma as unknown as PrismaService,
      relayer as unknown as RelayerService,
    );

    await expect(
      service.nextNonce(account.id, outsider.address.toLowerCase()),
    ).rejects.toThrow('Caller is not a signer of this account');
  });

  it('nextNonce: allows a caller who is a signer of the account', async () => {
    const account = makeAccount(2);
    const prisma = makePrismaMock(account);
    const relayer = { executeArcTransaction: jest.fn() };
    const service = new ArcTransactionService(
      prisma as unknown as PrismaService,
      relayer as unknown as RelayerService,
    );

    await expect(
      service.nextNonce(account.id, ownerB.address.toLowerCase()),
    ).resolves.toBe(0);
  });
});
