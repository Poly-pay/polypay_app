import { type Hex, formatEther, parseEther } from 'viem';
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
import {
  CreateAccountDto,
  TxStatus,
  TxType,
  ZEN_TOKEN,
  USDC_TOKEN,
  ZERO_ADDRESS,
  encodeERC20Transfer,
  encodeBatchTransferMulti,
  formatTokenAmount,
} from '@polypay/shared';
import {
  toTokenAmount,
  transferErc20FromSigner,
  getErc20Balance,
  generateVotePayload,
} from '../utils/transaction.util';
import {
  depositToAccount,
  getAccountBalance,
} from '../utils/contract.util';

const TEST_CHAIN_ID = 2651420;
const TEST_TRANSFER_AMOUNT = '0.0001';
const TEST_FUND_ETH_AMOUNT = '0.0003';
const TEST_FUND_ERC20_MULTIPLIER = 2;
const TEST_RECIPIENT =
  '0x87142a49c749dD05069836F9B81E5579E95BE0A6' as `0x${string}`;
const TEST_THRESHOLD = 2;

type AssetName = 'ETH' | 'ZEN' | 'USDC';

interface AssetScenario {
  name: AssetName;
  isNative: boolean;
  tokenAddress: `0x${string}` | null;
  decimals: number;
}

const SCENARIOS: AssetScenario[] = [
  {
    name: 'ETH',
    isNative: true,
    tokenAddress: null,
    decimals: 18,
  },
  {
    name: 'ZEN',
    isNative: false,
    tokenAddress: ZEN_TOKEN.addresses[TEST_CHAIN_ID] as `0x${string}`,
    decimals: ZEN_TOKEN.decimals,
  },
  {
    name: 'USDC',
    isNative: false,
    tokenAddress: USDC_TOKEN.addresses[TEST_CHAIN_ID] as `0x${string}`,
    decimals: USDC_TOKEN.decimals,
  },
];

interface ScenarioAmount {
  scenario: AssetScenario;
  amountBigInt: bigint;
  amountString: string;
}

type CreatedTx =
  | {
      kind: 'single';
      scenario: AssetScenario;
      amount: ScenarioAmount;
      txId: string;
    }
  | { kind: 'batch'; txId: string };

function getCreatedTxLabel(entry: CreatedTx): string {
  return entry.kind === 'single' ? entry.scenario.name : 'batch';
}

function buildSingleTransferParams(
  amount: ScenarioAmount,
  recipient: `0x${string}`,
): { to: `0x${string}`; value: bigint; callData: Hex } {
  const to = amount.scenario.isNative
    ? recipient
    : (amount.scenario.tokenAddress as `0x${string}`);
  const value = amount.scenario.isNative ? amount.amountBigInt : 0n;
  const callData = amount.scenario.isNative
    ? ('0x' as Hex)
    : (encodeERC20Transfer(recipient, amount.amountBigInt) as Hex);
  return { to, value, callData };
}

function buildBatchCallData(
  scenarioAmounts: ScenarioAmount[],
  recipient: `0x${string}`,
): Hex {
  const recipients = [
    recipient,
    recipient,
    recipient,
  ] as `0x${string}`[];
  const amounts = scenarioAmounts.map((a) => a.amountBigInt);
  const tokenAddresses = scenarioAmounts.map((a) =>
    a.scenario.tokenAddress ?? (ZERO_ADDRESS as `0x${string}`),
  );
  return encodeBatchTransferMulti(
    recipients,
    amounts,
    tokenAddresses as string[],
  ) as Hex;
}

interface ParsedBatchItem {
  recipient: string;
  amount: string;
  tokenAddress?: string | null;
}

function buildBatchCallDataFromParsed(parsedBatch: ParsedBatchItem[]): Hex {
  const recipients = parsedBatch.map((p) => p.recipient as `0x${string}`);
  const amounts = parsedBatch.map((p) => BigInt(p.amount));
  const tokenAddresses = parsedBatch.map(
    (p) => p.tokenAddress || ZERO_ADDRESS,
  );
  return encodeBatchTransferMulti(
    recipients,
    amounts,
    tokenAddresses,
  ) as Hex;
}

/**
 * Fund account: 2x per asset (single tx 0.0001 + batch item 0.0001).
 */
async function stagingFundAccountForScenario(
  scenario: AssetScenario,
  accountAddress: `0x${string}`,
  identityA: TestIdentity,
): Promise<ScenarioAmount> {
  if (scenario.isNative) {
    const balanceBefore = await getAccountBalance(accountAddress);
    await depositToAccount(identityA.signer, accountAddress, TEST_FUND_ETH_AMOUNT);
    const balanceAfter = await getAccountBalance(accountAddress);

    console.log(`[${scenario.name}] Fund native ETH - done`, {
      balanceBefore: formatEther(balanceBefore),
      balanceAfter: formatEther(balanceAfter),
    });

    const value = parseEther(TEST_TRANSFER_AMOUNT);
    return {
      scenario,
      amountBigInt: value,
      amountString: value.toString(),
    };
  }

  if (!scenario.tokenAddress) {
    throw new Error(`Token address is required for ERC20 scenario: ${scenario.name}`);
  }

  const fundHuman = (
    parseFloat(TEST_TRANSFER_AMOUNT) * TEST_FUND_ERC20_MULTIPLIER
  ).toFixed(scenario.decimals);
  const { amountBigInt: fundAmount } = toTokenAmount(
    fundHuman,
    scenario.decimals,
  );
  const { amountBigInt, amountString } = toTokenAmount(
    TEST_TRANSFER_AMOUNT,
    scenario.decimals,
  );

  const balanceBefore = await getErc20Balance(
    accountAddress,
    scenario.tokenAddress,
  );

  await transferErc20FromSigner(
    identityA.signer,
    scenario.tokenAddress,
    accountAddress,
    fundAmount,
  );

  const balanceAfter = await getErc20Balance(
    accountAddress,
    scenario.tokenAddress,
  );

  console.log(`[${scenario.name}] Fund ERC20 (2x) - done`, {
    tokenAddress: scenario.tokenAddress,
    balanceBefore: formatTokenAmount(
      balanceBefore.toString(),
      scenario.decimals,
    ),
    balanceAfter: formatTokenAmount(
      balanceAfter.toString(),
      scenario.decimals,
    ),
  });

  return {
    scenario,
    amountBigInt,
    amountString,
  };
}

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
        const funded = await stagingFundAccountForScenario(
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

      const batchCallData = buildBatchCallData(
        scenarioAmounts,
        TEST_RECIPIENT,
      );

      const { nonce: batchNonce } = await stagingReserveNonce(
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
          await stagingApproveTransaction(
            tokensB.accessToken,
            txId,
            votePayloadB,
          );
        } else {
          const { to: toApprove, value: valueApprove, callData: callDataApprove } =
            (() => {
              if (txDetails.to === undefined || txDetails.value === undefined) {
                throw new Error('Single transfer txDetails must have to and value');
              }
              const to = (txDetails.tokenAddress ?? txDetails.to) as `0x${string}`;
              const value = txDetails.tokenAddress ? 0n : BigInt(txDetails.value);
              const callData = txDetails.tokenAddress
                ? (encodeERC20Transfer(
                    txDetails.to,
                    BigInt(txDetails.value),
                  ) as Hex)
                : ('0x' as Hex);
              return { to, value, callData };
            })();

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
        expect(finalTx!.status).toBe(TxStatus.EXECUTED);

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
        });
      }

      console.log('Phase 6: Verify final state - done');
      console.log('=== Multi-asset Transaction E2E (Staging): Done ===\n');
    });
  });
});

