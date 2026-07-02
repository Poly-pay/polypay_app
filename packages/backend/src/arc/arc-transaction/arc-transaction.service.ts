import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { TxStatus, TxType, VoteType } from '@polypay/shared';
import { PrismaService } from '@/database/prisma.service';
import { RelayerService } from '@/relayer-wallet/relayer-wallet.service';
import { recoverArcSigner } from './signature.util';
import { CreateArcTransactionDto } from './dto/create-arc-transaction.dto';
import { ApproveArcTransactionDto } from './dto/approve-arc-transaction.dto';

// Arc transactions are native-value only today (see CreateArcTransactionDto),
// so calldata is always empty.
const ARC_NATIVE_TRANSFER_DATA = '0x';

type AccountWithSigners = {
  id: string;
  address: string;
  chainId: number;
  chainType: string;
  threshold: number;
  signers: { address: string | null }[];
};

@Injectable()
export class ArcTransactionService {
  private readonly logger = new Logger(ArcTransactionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly relayer: RelayerService,
  ) {}

  /**
   * Propose an Arc transaction. The proposer signs
   * getTransactionHash(nonce, to, value, data) off-chain (EIP-191); the
   * recovered address becomes both the owner-membership check and the
   * identity stored on the first vote.
   */
  async propose(dto: CreateArcTransactionDto, address: string) {
    const account = await this.getArcAccount(dto.accountId);
    const nonce = await this.getNextNonce(account.address, account.chainId);

    const recovered = await this.recoverAndAuthorize(
      account,
      nonce,
      dto.to,
      dto.value,
      dto.data,
      dto.signature,
      address,
    );

    const transaction = await this.prisma.$transaction(async (prisma) => {
      const tx = await prisma.transaction.create({
        data: {
          nonce,
          type: TxType.TRANSFER,
          status: TxStatus.PENDING,
          accountAddress: account.address,
          chainId: account.chainId,
          threshold: account.threshold,
          to: dto.to,
          value: dto.value,
          createdBy: recovered,
        },
      });

      // Vote has no dedicated "signer address" column for ECDSA (Arc) votes -
      // voterCommitment is reused as the identity key, matching how
      // ArcAccountService stores addresses on User.address instead of
      // User.commitment for the same reason.
      await prisma.vote.create({
        data: {
          txId: tx.txId,
          voterCommitment: recovered,
          voteType: VoteType.APPROVE,
          signature: dto.signature,
        },
      });

      return tx;
    });

    this.logger.log(
      `Arc transaction proposed: txId=${transaction.txId} account=${account.address} by=${recovered}`,
    );

    return {
      txId: transaction.txId,
      nonce: transaction.nonce,
      status: transaction.status,
    };
  }

  /**
   * Approve (add a signature to) a pending Arc transaction.
   */
  async approve(txId: number, dto: ApproveArcTransactionDto, address: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
      include: { account: { include: { signers: true } } },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${txId} not found`);
    }

    if (transaction.status === TxStatus.EXECUTED) {
      throw new BadRequestException('Transaction already executed');
    }

    const account = transaction.account as unknown as AccountWithSigners;

    const recovered = await this.recoverAndAuthorize(
      account,
      transaction.nonce,
      transaction.to,
      transaction.value,
      ARC_NATIVE_TRANSFER_DATA,
      dto.signature,
      address,
    );

    const existingVote = await this.prisma.vote.findUnique({
      where: { txId_voterCommitment: { txId, voterCommitment: recovered } },
    });

    if (existingVote) {
      throw new BadRequestException('Already voted on this transaction');
    }

    await this.prisma.vote.create({
      data: {
        txId,
        voterCommitment: recovered,
        voteType: VoteType.APPROVE,
        signature: dto.signature,
      },
    });

    this.logger.log(`Arc vote added for txId: ${txId} by ${recovered}`);

    return {
      txId,
      status: transaction.status,
      approveCount: await this.prisma.vote.count({
        where: { txId, voteType: VoteType.APPROVE },
      }),
      threshold: transaction.threshold,
    };
  }

  /**
   * Execute the transaction on-chain via the relayer once enough valid
   * signatures have been collected.
   */
  async execute(txId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
      include: { votes: true, account: true },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${txId} not found`);
    }

    if (transaction.status === TxStatus.EXECUTED) {
      throw new BadRequestException('Transaction already executed');
    }

    const signatures = transaction.votes
      .filter((vote) => vote.voteType === VoteType.APPROVE)
      .map((vote) => vote.signature)
      .filter((signature): signature is string => Boolean(signature));

    if (signatures.length < transaction.account.threshold) {
      throw new BadRequestException('threshold not met');
    }

    const txHash = await this.relayer.executeArcTransaction(
      transaction.accountAddress,
      transaction.nonce,
      transaction.to,
      BigInt(transaction.value),
      ARC_NATIVE_TRANSFER_DATA,
      signatures,
      transaction.chainId,
    );

    const updated = await this.prisma.transaction.update({
      where: { txId },
      data: {
        status: TxStatus.EXECUTED,
        txHash,
        executedAt: new Date(),
      },
    });

    this.logger.log(`Arc transaction executed: txId=${txId} txHash=${txHash}`);

    return {
      txId: updated.txId,
      status: updated.status,
      txHash: updated.txHash,
    };
  }

  /**
   * Next nonce the backend would assign for a fresh proposal on this
   * account. Exposed via GET /arc/transactions/next-nonce so the frontend
   * can fetch it before signing (the contract's parameterized-nonce
   * `execute` requires the proposer to sign over this exact nonce).
   */
  async nextNonce(accountId: string, callerAddress: string): Promise<number> {
    const account = await this.getArcAccount(accountId);
    this.assertMember(account, callerAddress);
    return this.getNextNonce(account.address, account.chainId);
  }

  /**
   * List Arc transactions for an account, most recent first.
   */
  async getTransactions(accountId: string, callerAddress: string) {
    const account = await this.getArcAccount(accountId);
    this.assertMember(account, callerAddress);

    const transactions = await this.prisma.transaction.findMany({
      where: { accountAddress: account.address, chainId: account.chainId },
      include: { votes: true },
      orderBy: { nonce: 'desc' },
    });

    return transactions.map((tx) => {
      const approvals = tx.votes.filter(
        (vote) => vote.voteType === VoteType.APPROVE,
      );

      return {
        id: tx.txId,
        nonce: tx.nonce,
        to: tx.to,
        value: tx.value,
        data: ARC_NATIVE_TRANSFER_DATA,
        status: tx.status,
        threshold: tx.threshold,
        approveCount: approvals.length,
        voters: approvals.map((vote) => vote.voterCommitment),
        txHash: tx.txHash,
      };
    });
  }

  // ============ Private Methods ============

  private async getArcAccount(accountId: string): Promise<AccountWithSigners> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { signers: true },
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    if (account.chainType !== 'ecdsa') {
      throw new BadRequestException(
        `Account ${accountId} is not an Arc (ecdsa) account`,
      );
    }

    return account as unknown as AccountWithSigners;
  }

  /**
   * Ensures the authenticated caller is a signer of the account before
   * allowing read access to its transactions/nonce (prevents an
   * authenticated Arc user from enumerating another account's data by
   * guessing accountId).
   */
  private assertMember(account: AccountWithSigners, callerAddress: string) {
    const isMember = account.signers.some(
      (signer) => signer.address?.toLowerCase() === callerAddress.toLowerCase(),
    );

    if (!isMember) {
      throw new ForbiddenException('Caller is not a signer of this account');
    }
  }

  private async getNextNonce(
    accountAddress: string,
    chainId: number,
  ): Promise<number> {
    const last = await this.prisma.transaction.findFirst({
      where: { accountAddress, chainId },
      orderBy: { nonce: 'desc' },
      select: { nonce: true },
    });

    return (last?.nonce ?? -1) + 1;
  }

  /**
   * Recovers the signer from an Arc tx signature, requires it to match the
   * authenticated caller (defense-in-depth: a caller cannot submit another
   * owner's signature under their own JWT), and requires it to be an owner
   * of the account.
   */
  private async recoverAndAuthorize(
    account: AccountWithSigners,
    nonce: number,
    to: string,
    value: string,
    data: string,
    signature: string,
    address: string,
  ): Promise<string> {
    const recovered = (
      await recoverArcSigner(
        account.address,
        account.chainId,
        nonce,
        to,
        BigInt(value),
        data,
        signature,
      )
    ).toLowerCase();

    if (recovered !== address.toLowerCase()) {
      throw new UnauthorizedException(
        'Signature does not match authenticated address',
      );
    }

    const isOwner = account.signers.some(
      (signer) => signer.address?.toLowerCase() === recovered,
    );

    if (!isOwner) {
      throw new BadRequestException('Signer is not an owner of this account');
    }

    return recovered;
  }
}
