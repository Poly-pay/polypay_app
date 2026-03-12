import {
  resetDatabase,
  setupTestApp,
  teardownTestApp,
} from '../setup';
import { getSignerA, getSignerB } from '../fixtures/test-users';
import { loginUser, AuthTokens } from '../utils/auth.util';
import { TestIdentity, createTestIdentity } from '../utils/identity.util';
import {
  apiCreateAccount,
  apiCreateBatchItem,
  apiReserveNonce,
  apiCreateTransaction,
  apiApproveTransaction,
  apiExecuteTransaction,
  apiGetTransaction,
  generateVotePayload,
} from '../utils/transaction.util';
import { CreateAccountDto, TxStatus, TxType } from '@polypay/shared';
import {
  TEST_CHAIN_ID,
  TEST_RECIPIENT,
  TEST_THRESHOLD,
  TEST_TRANSFER_AMOUNT,
  SCENARIOS,
  type CreatedTx,
  type ScenarioAmount,
  type ParsedBatchItem,
  getCreatedTxLabel,
  buildSingleTransferParams,
  buildSingleApproveParams,
  buildBatchCallData,
  buildBatchCallDataFromParsed,
  fundAccountForScenario,
} from '../utils/multi-asset-flow.shared';

// Timeout 20 minutes for blockchain calls
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
    it('should complete full flow for ETH, ZEN and USDC transfers', async () => {
      console.log('\n=== Multi-asset Transaction E2E: Start ===');

      // ============ STEP 1: Create Account ============
      console.log('Phase 1: Create Account - start');
      const createdAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const dataCreateAccount: CreateAccountDto = {
        name: `Multi-Sig Account ${createdAt}`,
        signers: [identityA.signerDto, identityB.signerDto],
        threshold: TEST_THRESHOLD,
        chainId: TEST_CHAIN_ID,
      };

      const { address: accountAddress } = await apiCreateAccount(
        tokensA.accessToken,
        dataCreateAccount,
      );
      console.log('Phase 1: Create Account - done', {
        accountAddress,
      });

      // ============ STEP 2: Fund account for all scenarios ============
      console.log('Phase 2: Fund account for all scenarios - start');
      const scenarioAmounts: ScenarioAmount[] = [];

      for (const scenario of SCENARIOS) {
        console.log(`[${scenario.name}] Funding start`);
        const funded = await fundAccountForScenario(
          scenario,
          accountAddress,
          identityA,
        );
        scenarioAmounts.push(funded);
        console.log(`[${scenario.name}] Funding recorded`, {
          amount: TEST_TRANSFER_AMOUNT,
        });
      }
      console.log('Phase 2: Fund account for all scenarios - done');

      // ============ STEP 3: Create Transactions (3 single + 1 batch) ============
      console.log('Phase 3: Create transactions - start');
      const createdTxs: CreatedTx[] = [];

      // 3 single transfers (ETH, ZEN, USDC)
      for (const amount of scenarioAmounts) {
        console.log(`[${amount.scenario.name}] Create single transaction - start`);

        const { nonce } = await apiReserveNonce(
          tokensA.accessToken,
          accountAddress,
        );

        const { to, value, callData } = buildSingleTransferParams(
          amount,
          TEST_RECIPIENT,
        );

        const votePayloadA = await generateVotePayload(
          identityA,
          accountAddress,
          BigInt(nonce),
          to,
          value,
          callData,
        );

        const { txId } = await apiCreateTransaction(tokensA.accessToken, {
          nonce,
          type: TxType.TRANSFER,
          accountAddress,
          to: TEST_RECIPIENT,
          value: amount.amountString,
          threshold: TEST_THRESHOLD,
          proof: votePayloadA.proof,
          publicInputs: votePayloadA.publicInputs,
          nullifier: votePayloadA.nullifier,
          ...(amount.scenario.isNative
            ? {}
            : { tokenAddress: amount.scenario.tokenAddress as `0x${string}` }),
        });

        createdTxs.push({ kind: 'single', scenario: amount.scenario, amount, txId });
        console.log(`[${amount.scenario.name}] Create single transaction - done`, {
          txId,
        });
      }

      // 1 batch tx (ETH + ZEN + USDC, same amounts)
      console.log('Batch: Create batch items - start');
      const batchItemIds: string[] = [];
      for (const amount of scenarioAmounts) {
        const item = await apiCreateBatchItem(tokensA.accessToken, {
          recipient: TEST_RECIPIENT,
          amount: amount.amountString,
          tokenAddress: amount.scenario.isNative
            ? undefined
            : (amount.scenario.tokenAddress as string),
        });
        batchItemIds.push(item.id);
      }
      console.log('Batch: Create batch items - done', { batchItemIds });

      const batchCallData = buildBatchCallData(scenarioAmounts, TEST_RECIPIENT);

      const { nonce: batchNonce } = await apiReserveNonce(
        tokensA.accessToken,
        accountAddress,
      );

      const batchVotePayloadA = await generateVotePayload(
        identityA,
        accountAddress,
        BigInt(batchNonce),
        accountAddress as `0x${string}`,
        0n,
        batchCallData,
      );

      const { txId: batchTxId } = await apiCreateTransaction(
        tokensA.accessToken,
        {
          nonce: batchNonce,
          type: TxType.BATCH,
          accountAddress,
          to: accountAddress,
          value: '0',
          threshold: TEST_THRESHOLD,
          proof: batchVotePayloadA.proof,
          publicInputs: batchVotePayloadA.publicInputs,
          nullifier: batchVotePayloadA.nullifier,
          batchItemIds,
        },
      );
      createdTxs.push({ kind: 'batch', txId: batchTxId });
      console.log('Batch: Create batch transaction - done', { batchTxId });

      console.log('Phase 3: Create transactions - done');

      // ============ STEP 4: Approve all 4 Transactions (Signer B) ============
      console.log('Phase 4: Approve transactions - start');
      for (const entry of createdTxs) {
        const txId = entry.txId;
        const label = getCreatedTxLabel(entry);
        console.log(`[${label}] Approve transaction - start`, { txId });

        const txDetails = (await apiGetTransaction(
          tokensA.accessToken,
          txId,
        )) as {
          nonce: number;
          to?: string;
          value?: string;
          tokenAddress?: string | null;
          batchData?: string;
        };

        if (entry.kind === 'batch') {
          if (txDetails.batchData == null) {
            throw new Error(`Batch tx ${txId} missing batchData`);
          }
          const parsedBatch = JSON.parse(txDetails.batchData) as ParsedBatchItem[];
          const callDataApprove = buildBatchCallDataFromParsed(parsedBatch);

          const votePayloadB = await generateVotePayload(
            identityB,
            accountAddress,
            BigInt(txDetails.nonce),
            accountAddress as `0x${string}`,
            0n,
            callDataApprove,
          );
          await apiApproveTransaction(
            tokensB.accessToken,
            txId,
            votePayloadB,
          );
        } else {
          const { to: toApprove, value: valueApprove, callData: callDataApprove } =
            buildSingleApproveParams(txDetails);

          const votePayloadB = await generateVotePayload(
            identityB,
            accountAddress,
            BigInt(txDetails.nonce),
            toApprove,
            valueApprove,
            callDataApprove,
          );
          await apiApproveTransaction(
            tokensB.accessToken,
            txId,
            votePayloadB,
          );
        }

        console.log(`[${label}] Approve transaction - done`, { txId });
      }
      console.log('Phase 4: Approve transactions - done');

      // ============ STEP 5: Execute all 4 Transactions sequentially ============
      console.log('Phase 5: Execute transactions - start');
      for (const entry of createdTxs) {
        const txId = entry.txId;
        const label = getCreatedTxLabel(entry);
        console.log(`[${label}] Execute transaction - start`, { txId });

        const { txHash } = await apiExecuteTransaction(
          tokensA.accessToken,
          txId,
        );
        expect(txHash).toBeDefined();

        console.log(`[${label}] Execute transaction - done`, { txId, txHash });
      }
      console.log('Phase 5: Execute transactions - done');

      // ============ STEP 6: Verify Final State for all 4 transactions ============
      console.log('Phase 6: Verify final state - start');

      for (const entry of createdTxs) {
        const txId = entry.txId;
        const label = getCreatedTxLabel(entry);

        const finalTx = (await apiGetTransaction(
          tokensA.accessToken,
          txId,
        )) as {
          status: TxStatus;
          votes: unknown[];
          tokenAddress?: string | null;
          value?: string;
        } | null;

        expect(finalTx).not.toBeNull();
        expect(finalTx!.status).toBe(TxStatus.EXECUTED);
        expect(finalTx!.votes.length).toBe(2);

        if (entry.kind === 'single') {
          if (entry.scenario.isNative) {
            expect(finalTx!.tokenAddress).toBeNull();
          } else {
            expect(finalTx!.tokenAddress?.toLowerCase()).toBe(
              (entry.scenario.tokenAddress as string).toLowerCase(),
            );
          }
          expect(finalTx!.value).toBe(entry.amount.amountString);
        }

        console.log(`[${label}] Final verification - done`, {
          status: finalTx?.status,
          votes: finalTx?.votes.length,
        });
      }

      console.log('Phase 6: Verify final state - done');
      console.log('=== Multi-asset Transaction E2E: Done ===\n');
    });
  });
});
