import { type Hex, formatEther, parseEther } from 'viem';
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
  apiCreateBatchItem,
  apiReserveNonce,
  apiCreateTransaction,
  apiApproveTransaction,
  apiExecuteTransaction,
  apiGetTransaction,
  generateVotePayload,
  toTokenAmount,
  transferErc20FromSigner,
  getErc20Balance,
} from '../utils/transaction.util';
import {
  CreateAccountDto,
  encodeERC20Transfer,
  encodeBatchTransferMulti,
  TxStatus,
  TxType,
  ZEN_TOKEN,
  USDC_TOKEN,
  ZERO_ADDRESS,
} from '@polypay/shared';

const TEST_CHAIN_ID = 2651420;
const TEST_TRANSFER_AMOUNT = '0.0001'; // per tx (single + batch item)
const TEST_FUND_ETH_AMOUNT = '0.0004'; // 2x transfer (0.0002) + gas for 4 txs
const TEST_FUND_ERC20_MULTIPLIER = 2; // fund 2x so: 1x single tx + 1x batch item
const TEST_RECIPIENT =
  '0x87142a49c749dD05069836F9B81E5579E95BE0A6' as `0x${string}`;

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

/**
 * Fund account: 2x per asset (single tx 0.0001 + batch item 0.0001).
 * Returns ScenarioAmount for one transfer (0.0001) used by both single tx and batch item.
 */
async function fundAccountForScenario(
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

  // Fund 2x so: 1x single transfer + 1x batch transfer
  const fundHuman = (
    parseFloat(TEST_TRANSFER_AMOUNT) * TEST_FUND_ERC20_MULTIPLIER
  ).toFixed(scenario.decimals);
  const { amountBigInt: fundAmount } = toTokenAmount(fundHuman, scenario.decimals);
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
    balanceBefore: balanceBefore.toString(),
    balanceAfter: balanceAfter.toString(),
  });

  return {
    scenario,
    amountBigInt,
    amountString,
  };
}

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
    it('should complete full flow for ETH, ZEN and USDC transfers', async () => {
      console.log('\n=== Multi-asset Transaction E2E: Start ===');

      // ============ STEP 1: Create Account ============
      console.log('Phase 1: Create Account - start');
      const dataCreateAccount: CreateAccountDto = {
        name: 'Test Multi-Sig Account (Multi-asset)',
        signers: [identityA.signerDto, identityB.signerDto],
        threshold: 2,
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
          amount: funded.amountString,
        });
      }
      console.log('Phase 2: Fund account for all scenarios - done');

      // ============ STEP 3: Create Transactions (3 single + 1 batch) ============
      console.log('Phase 3: Create transactions - start');
      type CreatedTx =
        | {
            kind: 'single';
            scenario: AssetScenario;
            amount: ScenarioAmount;
            txId: string;
          }
        | { kind: 'batch'; txId: string };
      const createdTxs: CreatedTx[] = [];

      const recipient = TEST_RECIPIENT;

      // 3 single transfers (ETH, ZEN, USDC)
      for (const amount of scenarioAmounts) {
        console.log(`[${amount.scenario.name}] Create single transaction - start`);

        const { nonce } = await apiReserveNonce(
          tokensA.accessToken,
          accountAddress,
        );

        const to = amount.scenario.isNative
          ? (recipient as `0x${string}`)
          : (amount.scenario.tokenAddress as `0x${string}`);
        const value = amount.scenario.isNative ? amount.amountBigInt : 0n;
        const callData = amount.scenario.isNative
          ? ('0x' as Hex)
          : (encodeERC20Transfer(recipient, amount.amountBigInt) as Hex);

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
          to: recipient,
          value: amount.amountString,
          threshold: 2,
          creatorCommitment: identityA.commitment,
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

      const batchRecipient = TEST_RECIPIENT;
      const batchRecipients = [
        batchRecipient as `0x${string}`,
        batchRecipient as `0x${string}`,
        batchRecipient as `0x${string}`,
      ];
      const batchAmounts = scenarioAmounts.map((a) => a.amountBigInt);
      const batchTokenAddresses = scenarioAmounts.map((a) =>
        a.scenario.tokenAddress ?? (ZERO_ADDRESS as `0x${string}`),
      );
      const batchCallData = encodeBatchTransferMulti(
        batchRecipients,
        batchAmounts,
        batchTokenAddresses as string[],
      ) as Hex;

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
          threshold: 2,
          creatorCommitment: identityA.commitment,
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
        const label = entry.kind === 'single' ? entry.scenario.name : 'batch';
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
          const parsedBatch = JSON.parse(txDetails.batchData!) as Array<{
            recipient: string;
            amount: string;
            tokenAddress?: string | null;
          }>;
          const approveRecipients = parsedBatch.map(
            (p) => p.recipient as `0x${string}`,
          );
          const approveAmounts = parsedBatch.map((p) => BigInt(p.amount));
          const approveTokenAddresses = parsedBatch.map(
            (p) => p.tokenAddress || ZERO_ADDRESS,
          );
          const callDataApprove = encodeBatchTransferMulti(
            approveRecipients,
            approveAmounts,
            approveTokenAddresses,
          ) as Hex;

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
          const toApprove = txDetails.tokenAddress
            ? (txDetails.tokenAddress as `0x${string}`)
            : (txDetails.to as `0x${string}`);
          const valueApprove = txDetails.tokenAddress
            ? 0n
            : BigInt(txDetails.value!);
          const callDataApprove = txDetails.tokenAddress
            ? (encodeERC20Transfer(
                txDetails.to!,
                BigInt(txDetails.value!),
              ) as Hex)
            : ('0x' as Hex);

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
        const label = entry.kind === 'single' ? entry.scenario.name : 'batch';
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
      const prisma = getPrismaService(getTestApp());

      for (const entry of createdTxs) {
        const txId = entry.txId;
        const label = entry.kind === 'single' ? entry.scenario.name : 'batch';

        const finalTx = (await prisma.transaction.findUnique({
          where: { txId: Number(txId) },
          include: { votes: true },
        })) as {
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
