import * as request from 'supertest';
import { type Hex, formatEther } from 'viem';
import {
  setupTestApp,
  teardownTestApp,
  resetDatabase,
  getHttpServer,
  getTestApp,
} from '../setup';
import { getSignerA, getSignerB } from '../fixtures/test-accounts';
import { createTestSigner, TestSigner } from '../utils/signer.util';
import {
  generateSecret,
  generateCommitment,
  generateTestProof,
} from '../utils/proof.util';
import {
  depositToWallet,
  getTransactionHash,
  getWalletBalance,
} from '../utils/contract.util';
import { getPrismaService } from '../utils/cleanup.util';
import { loginUser, getAuthHeader, AuthTokens } from '../utils/auth.util';
import {
  API_ENDPOINTS,
  CreateWalletDto,
  TxStatus,
  TxType,
} from '@polypay/shared';

// Timeout 5 minutes for blockchain calls
jest.setTimeout(300000);

describe('Transaction E2E', () => {
  let signerA: TestSigner;
  let signerB: TestSigner;
  let secretA: bigint;
  let secretB: bigint;
  let commitmentA: string;
  let commitmentB: string;
  let tokensA: AuthTokens;
  let tokensB: AuthTokens;

  beforeAll(async () => {
    // Setup NestJS app
    await setupTestApp();

    // Setup test signers
    signerA = createTestSigner(getSignerA());
    signerB = createTestSigner(getSignerB());

    // Generate secrets and commitments
    secretA = await generateSecret(signerA);
    secretB = await generateSecret(signerB);

    const commitmentABigInt = await generateCommitment(secretA);
    const commitmentBBigInt = await generateCommitment(secretB);

    commitmentA = commitmentABigInt.toString();
    commitmentB = commitmentBBigInt.toString();

    console.log('Test setup complete:');
    console.log('  Signer A address:', signerA.address);
    console.log('  Signer B address:', signerB.address);
    console.log('  Commitment A:', commitmentA);
    console.log('  Commitment B:', commitmentB);
  });

  beforeEach(async () => {
    await resetDatabase();
    // Login both users
    console.log('\n--- Login Users ---');
    tokensA = await loginUser(secretA, commitmentA);
    tokensB = await loginUser(secretB, commitmentB);
    console.log('  User A logged in');
    console.log('  User B logged in');
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('Full transaction flow', () => {
    it('should complete full flow: create wallet → create tx → approve → execute', async () => {
      const server = getHttpServer();

      // ============ STEP 1: Create Wallet ============
      console.log('\n--- Step 1: Create Wallet ---');

      const dataCreateWallet: CreateWalletDto = {
        name: 'Test Multi-Sig Wallet',
        commitments: [commitmentA, commitmentB],
        threshold: 2,
      };

      const walletResponse = await request(server)
        .post(API_ENDPOINTS.wallets.base)
        .set(getAuthHeader(tokensA.accessToken))
        .send(dataCreateWallet)
        .expect(201);

      expect(walletResponse.body).toHaveProperty('address');

      const walletAddress = walletResponse.body.address as `0x${string}`;
      console.log('Wallet created:');
      console.log('  Address:', walletAddress);

      // ============ STEP 2: Deposit ETH to Wallet ============
      console.log('\n--- Step 2: Deposit ETH to Wallet ---');

      const balanceBefore = await getWalletBalance(walletAddress);
      console.log('  Balance before:', formatEther(balanceBefore), 'ETH');

      await depositToWallet(signerA, walletAddress, '0.001');

      const balanceAfter = await getWalletBalance(walletAddress);
      console.log('  Balance after:', formatEther(balanceAfter), 'ETH');

      expect(balanceAfter).toBeGreaterThan(balanceBefore);

      // ============ STEP 3: Create Transaction ============
      console.log('\n--- Step 3: Create Transaction ---');

      // 3.1 Reserve nonce
      const reserveNonceResponse = await request(server)
        .post(API_ENDPOINTS.transactions.reserveNonce)
        .set(getAuthHeader(tokensA.accessToken))
        .send({ walletAddress })
        .expect(201);

      const nonce = reserveNonceResponse.body.nonce;
      console.log('  Reserved nonce:', nonce);

      // 3.2 Prepare transfer params
      const recipient =
        '0x87142a49c749dD05069836F9B81E5579E95BE0A6' as `0x${string}`;
      const value = BigInt('1000000000000000'); // 0.001 ETH
      const callData = '0x' as Hex;

      // 3.3 Get txHash from contract
      const txHash = await getTransactionHash(
        walletAddress,
        BigInt(nonce),
        recipient,
        value,
        callData,
      );
      console.log('  TxHash from contract:', txHash);

      // 3.4 Generate proof for signer A
      console.log('  Generating proof for Signer A...');
      const proofA = await generateTestProof(signerA, secretA, txHash);
      console.log('  Proof A generated');

      // 3.5 Create transaction
      const createTxResponse = await request(server)
        .post(API_ENDPOINTS.transactions.base)
        .set(getAuthHeader(tokensA.accessToken))
        .send({
          nonce: nonce,
          type: TxType.TRANSFER,
          walletAddress: walletAddress,
          to: recipient,
          value: value.toString(),
          threshold: 2,
          totalSigners: 2,
          creatorCommitment: commitmentA,
          proof: proofA.proof,
          publicInputs: proofA.publicInputs,
          nullifier: proofA.nullifier,
        })
        .expect(201);

      const txId = createTxResponse.body.txId;
      console.log('  Transaction created, txId:', txId);

      // ============ STEP 4: Approve Transaction (Signer B) ============
      console.log('\n--- Step 4: Approve Transaction (Signer B) ---');

      // 4.1 Get transaction details
      const getTxResponse = await request(server)
        .get(API_ENDPOINTS.transactions.byTxId(txId))
        .set(getAuthHeader(tokensA.accessToken))
        .expect(200);

      console.log('  Transaction status:', getTxResponse.body.status);

      // 4.2 Get txHash for approve
      const txHashForApprove = await getTransactionHash(
        walletAddress,
        BigInt(getTxResponse.body.nonce),
        getTxResponse.body.to as `0x${string}`,
        BigInt(getTxResponse.body.value),
        callData,
      );

      // 4.3 Generate proof for signer B
      console.log('  Generating proof for Signer B...');
      const proofB = await generateTestProof(
        signerB,
        secretB,
        txHashForApprove,
      );
      console.log('  Proof B generated');

      // 4.4 Approve transaction
      await request(server)
        .post(API_ENDPOINTS.transactions.approve(txId))
        .set(getAuthHeader(tokensB.accessToken))
        .send({
          voterCommitment: commitmentB,
          proof: proofB.proof,
          publicInputs: proofB.publicInputs,
          nullifier: proofB.nullifier,
        })
        .expect(201);

      console.log('  Transaction approved by Signer B');

      // ============ STEP 5: Execute Transaction ============
      console.log('\n--- Step 5: Execute Transaction ---');

      const executeResponse = await request(server)
        .post(API_ENDPOINTS.transactions.execute(txId))
        .set(getAuthHeader(tokensA.accessToken))
        .expect(201);

      expect(executeResponse.body).toHaveProperty('txHash');
      console.log('  Execute TxHash:', executeResponse.body.txHash);

      // ============ STEP 6: Verify Final State ============
      console.log('\n--- Step 6: Verify Final State ---');

      const prisma = getPrismaService(getTestApp());

      const finalTx = await prisma.transaction.findUnique({
        where: { txId: txId },
        include: { votes: true },
      });

      expect(finalTx).not.toBeNull();
      expect(finalTx!.status).toBe(TxStatus.EXECUTED);
      expect(finalTx!.votes.length).toBe(2);

      console.log('Final verification:');
      console.log('  Status:', finalTx!.status);
      console.log('  Vote count:', finalTx!.votes.length);
      console.log('\n✅ Full transaction flow completed successfully!');
    });
  });
});
