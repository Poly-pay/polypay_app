import { getSignerA, getSignerB } from '../fixtures/test-users';
import { TestIdentity, createTestIdentity } from '../utils/identity.util';
import {
  stagingLogin,
  stagingCreateAccount,
  stagingReserveNonce,
  stagingCreateTransaction,
  stagingApproveTransaction,
  stagingExecuteTransaction,
  stagingGetTransaction,
  stagingCreateBatchItem,
} from '../utils/staging-api.util';
import { CreateAccountDto, TxStatus, TxType } from '@polypay/shared';
import { generateVotePayload } from '../utils/transaction.util';
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

async function waitForExecuted(
  accessToken: string,
  txId: string,
  label: string,
): Promise<any> {
  const maxAttempts = 20;
  const intervalMs = 15000;

  let lastStatus: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const tx = await stagingGetTransaction(accessToken, txId);
    lastStatus = tx.status;

    if (tx.status === TxStatus.EXECUTED) {
      return tx;
    }

    console.log(
      `[${label}] Waiting for EXECUTED - attempt ${attempt}, status=${tx.status}`,
    );

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(
    `[${label}] Transaction ${txId} did not reach EXECUTED within timeout. Last status=${lastStatus}`,
  );
}

// Timeout 20 minutes for blockchain calls
jest.setTimeout(1200000);

describe('Transaction Staging E2E', () => {
  let identityA: TestIdentity;
  let identityB: TestIdentity;
  let tokensA: { accessToken: string; refreshToken: string };
  let tokensB: { accessToken: string; refreshToken: string };

  beforeAll(async () => {
    identityA = await createTestIdentity(getSignerA, 'Signer A');
    identityB = await createTestIdentity(getSignerB, 'Signer B');
  });

  beforeEach(async () => {
    tokensA = await stagingLogin(identityA.secret, identityA.commitment);
    tokensB = await stagingLogin(identityB.secret, identityB.commitment);
  });

  describe('Full transaction flow (staging)', () => {
    it('should complete full flow for ETH, ZEN and USDC transfers + batch on staging', async () => {
      console.log('\n=== Multi-asset Transaction E2E (Staging): Start ===');

      // ============ STEP 1: Create Account ============
      console.log('Phase 1: Create Account - start');
      const createdAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const dataCreateAccount: CreateAccountDto = {
        name: `Multi-Sig Account ${createdAt}`,
        signers: [identityA.signerDto, identityB.signerDto],
        threshold: TEST_THRESHOLD,
        chainId: TEST_CHAIN_ID,
      };

      const { address: accountAddress } = await stagingCreateAccount(
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
        console.log(
          `[${amount.scenario.name}] Create single transaction - start`,
        );

        const { nonce } = await stagingReserveNonce(
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

        const { txId } = await stagingCreateTransaction(tokensA.accessToken, {
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
            : { tokenAddress: amount.scenario.tokenAddress }),
        });

        createdTxs.push({
          kind: 'single',
          scenario: amount.scenario,
          amount,
          txId,
        });
        console.log(
          `[${amount.scenario.name}] Create single transaction - done`,
          {
            txId,
          },
        );
      }

      // 1 batch tx (ETH + ZEN + USDC, same amounts)
      console.log('Batch: Create batch items - start');
      const batchItemIds: string[] = [];
      for (const amount of scenarioAmounts) {
        const item = await stagingCreateBatchItem(tokensA.accessToken, {
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

      const { nonce: batchNonce } = await stagingReserveNonce(
        tokensA.accessToken,
        accountAddress,
      );

      const batchVotePayloadA = await generateVotePayload(
        identityA,
        accountAddress,
        BigInt(batchNonce),
        accountAddress,
        0n,
        batchCallData,
      );

      const { txId: batchTxId } = await stagingCreateTransaction(
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

        const txDetails = (await stagingGetTransaction(
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
          const parsedBatch = JSON.parse(
            txDetails.batchData,
          ) as ParsedBatchItem[];
          const callDataApprove = buildBatchCallDataFromParsed(parsedBatch);

          const votePayloadB = await generateVotePayload(
            identityB,
            accountAddress,
            BigInt(txDetails.nonce),
            accountAddress,
            0n,
            callDataApprove,
          );
          await stagingApproveTransaction(
            tokensB.accessToken,
            txId,
            votePayloadB,
          );
        } else {
          const {
            to: toApprove,
            value: valueApprove,
            callData: callDataApprove,
          } = buildSingleApproveParams(txDetails);

          const votePayloadB = await generateVotePayload(
            identityB,
            accountAddress,
            BigInt(txDetails.nonce),
            toApprove,
            valueApprove,
            callDataApprove,
          );
          await stagingApproveTransaction(
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

        const { txHash } = await stagingExecuteTransaction(
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

        const finalTx = (await waitForExecuted(
          tokensA.accessToken,
          txId,
          label,
        )) as {
          status: TxStatus;
          votes: unknown[];
          tokenAddress?: string | null;
          value?: string;
        } | null;

        expect(finalTx).not.toBeNull();
        expect(finalTx.status).toBe(TxStatus.EXECUTED);

        if (entry.kind === 'single') {
          if (entry.scenario.isNative) {
            expect(finalTx.tokenAddress).toBeNull();
          } else {
            expect(finalTx.tokenAddress?.toLowerCase()).toBe(
              (entry.scenario.tokenAddress as string).toLowerCase(),
            );
          }
          expect(finalTx.value).toBe(entry.amount.amountString);
        }

        console.log(`[${label}] Final verification - done`, {
          status: finalTx?.status,
        });
      }

      console.log('Phase 6: Verify final state - done');
      console.log('=== Multi-asset Transaction E2E (Staging): Done ===\n');
    });
  });
});
