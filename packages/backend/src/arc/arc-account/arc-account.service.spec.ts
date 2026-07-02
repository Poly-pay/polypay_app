import { ArcAccountService } from './arc-account.service';
import { RelayerService } from '@/relayer-wallet/relayer-wallet.service';
import { PrismaService } from '@/database/prisma.service';

// Minimal in-memory Prisma mock: only the models/methods ArcAccountService
// touches (user.upsert, account.create/findUniqueOrThrow, accountSigner.create,
// $transaction passthrough). Mirrors the arc-auth.service.spec.ts style of
// instantiating the service directly instead of a full Nest TestingModule.
function makePrismaMock() {
  const usersByAddress = new Map<string, { id: string; address: string }>();
  let accountRow: any;
  const signerRows: any[] = [];
  let userSeq = 0;
  let accountSeq = 0;

  const prisma = {
    user: {
      upsert: jest.fn(async ({ where, create }: any) => {
        const existing = usersByAddress.get(where.address);
        if (existing) return existing;
        const user = { id: `user-${++userSeq}`, address: create.address };
        usersByAddress.set(user.address, user);
        return user;
      }),
    },
    account: {
      create: jest.fn(async ({ data }: any) => {
        accountRow = { id: `account-${++accountSeq}`, ...data };
        return accountRow;
      }),
      findUniqueOrThrow: jest.fn(async () => ({
        ...accountRow,
        signers: signerRows,
      })),
    },
    accountSigner: {
      create: jest.fn(async ({ data }: any) => {
        const signer = { id: `signer-${signerRows.length + 1}`, ...data };
        signerRows.push(signer);
        return signer;
      }),
    },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };

  return prisma;
}

describe('ArcAccountService', () => {
  const owners = [`0x${'1'.repeat(40)}`, `0x${'2'.repeat(40)}`];
  const ARC_CHAIN_ID = 5042002;

  it('creates an Arc account: deploys, persists Account(ecdsa)+signers+users', async () => {
    const relayer = {
      deployArcAccount: jest.fn().mockResolvedValue('0xWALLET'),
    };
    const prisma = makePrismaMock();
    const service = new ArcAccountService(
      relayer as unknown as RelayerService,
      prisma as unknown as PrismaService,
    );

    const res = await service.create({
      owners,
      threshold: 2,
      chainId: ARC_CHAIN_ID,
    });

    expect(res.address).toBe('0xWALLET');
    expect(relayer.deployArcAccount).toHaveBeenCalledWith(
      owners,
      2,
      ARC_CHAIN_ID,
    );
    expect(prisma.account.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ chainType: 'ecdsa' }),
      }),
    );
    expect(prisma.accountSigner.create).toHaveBeenCalledTimes(2);
    expect(prisma.user.upsert).toHaveBeenCalledTimes(2);
  });

  it('rejects an invalid owner address', async () => {
    const relayer = { deployArcAccount: jest.fn() };
    const prisma = makePrismaMock();
    const service = new ArcAccountService(
      relayer as unknown as RelayerService,
      prisma as unknown as PrismaService,
    );

    await expect(
      service.create({
        owners: ['not-an-address', owners[1]],
        threshold: 1,
        chainId: ARC_CHAIN_ID,
      }),
    ).rejects.toThrow();
    expect(relayer.deployArcAccount).not.toHaveBeenCalled();
  });

  it('rejects threshold out of range', async () => {
    const relayer = { deployArcAccount: jest.fn() };
    const prisma = makePrismaMock();
    const service = new ArcAccountService(
      relayer as unknown as RelayerService,
      prisma as unknown as PrismaService,
    );

    await expect(
      service.create({ owners, threshold: 3, chainId: ARC_CHAIN_ID }),
    ).rejects.toThrow();
    expect(relayer.deployArcAccount).not.toHaveBeenCalled();
  });

  it('rejects a non-ecdsa (zk) chainId', async () => {
    const relayer = { deployArcAccount: jest.fn() };
    const prisma = makePrismaMock();
    const service = new ArcAccountService(
      relayer as unknown as RelayerService,
      prisma as unknown as PrismaService,
    );

    await expect(
      service.create({ owners, threshold: 1, chainId: 2651420 }),
    ).rejects.toThrow();
    expect(relayer.deployArcAccount).not.toHaveBeenCalled();
  });
});
