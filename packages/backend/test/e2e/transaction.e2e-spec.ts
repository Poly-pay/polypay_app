import { type Hex, formatEther } from 'viem';
import {
  setupTestApp,
  teardownTestApp,
  resetDatabase,
  getTestApp,
} from '../setup';
import { getSignerA, getSignerB } from '../fixtures/test-users';
import {
  depositToAccount,
  getAccountBalance,
} from '../utils/contract.util';
import { getPrismaService } from '../utils/cleanup.util';
import { loginUser, AuthTokens } from '../utils/auth.util';
import { TestIdentity, createTestIdentity } from '../utils/identity.util';
import {
  apiCreateAccount,
  apiReserveNonce,
  apiCreateTransaction,
  apiApproveTransaction,
  apiExecuteTransaction,
  apiGetTransaction,
  generateVotePayload,
} from '../utils/transaction.util';
import {
  CreateAccountDto,
  TxStatus,
  TxType,
} from '@polypay/shared';

// Timeout 10 minutes for blockchain calls
jest.setTimeout(1200000); 

describe('Transaction E2E', () => {
  let identityA: TestIdentity;
  let identityB: TestIdentity;
  let tokensA: AuthTokens;
  let tokensB: AuthTokens;

  beforeAll(async () => {
    // Setup NestJS app
    await setupTestApp();

    identityA = await createTestIdentity(getSignerA, 'Signer A');
    identityB = await createTestIdentity(getSignerB, 'Signer B');
  });

  beforeEach(async () => {
    await resetDatabase();
    // Login both users
    tokensA = await loginUser(identityA.secret, identityA.commitment);
    tokensB = await loginUser(identityB.secret, identityB.commitment);
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('Full transaction flow', () => {
    it('should complete full flow: create account → create tx → approve → execute', async () => {
      console.log('\n=== Transaction E2E: Start ===');

      // ============ STEP 1: Create Account ============
      console.log('Step 1: Create Account - start');
      const dataCreateAccount: CreateAccountDto = {
        name: 'Test Multi-Sig Account',
        signers: [identityA.signerDto, identityB.signerDto],
        threshold: 2,
        chainId: 2651420,
      };

      const { address: accountAddress } = await apiCreateAccount(
        tokensA.accessToken,
        dataCreateAccount,
      );
      console.log('Step 1: Create Account - done', {
        accountAddress,
      });

      // ============ STEP 2: Deposit ETH to Account ============
      console.log('Step 2: Deposit - start');
      const balanceBefore = await getAccountBalance(accountAddress);
      await depositToAccount(identityA.signer, accountAddress, '0.0001');

      const balanceAfter = await getAccountBalance(accountAddress);

      expect(balanceAfter).toBeGreaterThan(balanceBefore);
      console.log('Step 2: Deposit - done', {
        balanceBefore: formatEther(balanceBefore),
        balanceAfter: formatEther(balanceAfter),
      });

      // ============ STEP 3: Create Transaction ============
      // 3.1 Reserve nonce
      console.log('Step 3.1: Reserve nonce - start');
      const { nonce } = await apiReserveNonce(
        tokensA.accessToken,
        accountAddress,
      );
      console.log('Step 3.1: Reserve nonce - done', { nonce });

      // 3.2 Prepare transfer params
      const recipient =
        '0x87142a49c749dD05069836F9B81E5579E95BE0A6' as `0x${string}`;
      const value = BigInt('100000000000000'); // 0.0001 ETH
      const callData = '0x' as Hex;

      // 3.3 Generate proof for signer A and create transaction
      console.log('Step 3.2: Generate proof A - start');
      const votePayloadA = await generateVotePayload(
        identityA,
        accountAddress,
        BigInt(nonce),
        recipient,
        value,
        callData,
      );
      console.log('Step 3.2: Generate proof A - done');

      console.log('Step 3.3: Create transaction - start');
      const { txId } = await apiCreateTransaction(tokensA.accessToken, {
        nonce,
        type: TxType.TRANSFER,
        accountAddress,
        to: recipient,
        value: value.toString(),
        threshold: 2,
        creatorCommitment: identityA.commitment,
        proof: votePayloadA.proof,
        publicInputs: votePayloadA.publicInputs,
        nullifier: votePayloadA.nullifier,
      });
      console.log('Step 3.3: Create transaction - done', { txId });

      // ============ STEP 4: Approve Transaction (Signer B) ============
      // 4.1 Get transaction details
      console.log('Step 4.1: Get transaction details - start');
      const txDetails = (await apiGetTransaction(
        tokensA.accessToken,
        txId,
      )) as {
        nonce: number;
        to: string;
        value: string;
      };
      console.log('Step 4.1: Get transaction details - done', {
        nonce: txDetails.nonce,
        to: txDetails.to,
        value: txDetails.value,
      });

      // 4.2 Generate proof for signer B and approve
      console.log('Step 4.2: Generate proof B - start');
      const votePayloadB = await generateVotePayload(
        identityB,
        accountAddress,
        BigInt(txDetails.nonce),
        txDetails.to as `0x${string}`,
        BigInt(txDetails.value),
        callData,
      );
      console.log('Step 4.2: Generate proof B - done');

      console.log('Step 4.3: Approve transaction - start');
      await apiApproveTransaction(tokensB.accessToken, txId, votePayloadB);
      console.log('Step 4.3: Approve transaction - done');

      // ============ STEP 5: Execute Transaction ============
      console.log('Step 5: Execute transaction - start');
      const { txHash } = await apiExecuteTransaction(
        tokensA.accessToken,
        txId,
      );
      expect(txHash).toBeDefined();
      console.log('Step 5: Execute transaction - done', { txHash });

      // ============ STEP 6: Verify Final State ============
      console.log('Step 6: Verify final state - start');
      const prisma = getPrismaService(getTestApp());

      const finalTx = (await prisma.transaction.findUnique({
        where: { txId: Number(txId) },
        include: { votes: true },
      })) as {
        status: TxStatus;
        votes: unknown[];
      } | null;

      expect(finalTx).not.toBeNull();
      expect(finalTx!.status).toBe(TxStatus.EXECUTED);
      expect(finalTx!.votes.length).toBe(2);
      console.log('Step 6: Verify final state - done', {
        status: finalTx?.status,
        votes: finalTx?.votes.length,
      });

      console.log('=== Transaction E2E: Done ===\n');
    });
  });
});
