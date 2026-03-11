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
  TxStatus,
  TxType,
  ZEN_TOKEN,
  USDC_TOKEN,
} from '@polypay/shared';

const TEST_CHAIN_ID = 2651420;
const TEST_TRANSFER_AMOUNT = '0.0001';
const TEST_FUND_ETH_AMOUNT = '0.0003'; // 3x transfer amount to cover gas + ERC20
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

async function fundAccountForScenario(
  scenario: AssetScenario,
  accountAddress: `0x${string}`,
  identityA: TestIdentity,
): Promise<ScenarioAmount> {
  if (scenario.isNative) {
    // Native ETH funding via direct deposit
    const balanceBefore = await getAccountBalance(accountAddress);
    // Fund a bit extra to cover gas for ERC20 transfers as well (3x amount)
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
    amountBigInt,
  );

  const balanceAfter = await getErc20Balance(
    accountAddress,
    scenario.tokenAddress,
  );

  console.log(`[${scenario.name}] Fund ERC20 - done`, {
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

      // ============ STEP 3: Create Transactions for all scenarios ============
      console.log('Phase 3: Create transactions - start');
      const createdTxs: {
        scenario: AssetScenario;
        amount: ScenarioAmount;
        txId: string;
      }[] = [];

      const recipient = TEST_RECIPIENT;
      const callData = '0x' as Hex;

      for (const amount of scenarioAmounts) {
        console.log(`[${amount.scenario.name}] Create transaction - start`);

        const { nonce } = await apiReserveNonce(
          tokensA.accessToken,
          accountAddress,
        );

        const votePayloadA = await generateVotePayload(
          identityA,
          accountAddress,
          BigInt(nonce),
          recipient,
          amount.amountBigInt,
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

        createdTxs.push({ scenario: amount.scenario, amount, txId });

        console.log(`[${amount.scenario.name}] Create transaction - done`, {
          txId,
        });
      }
      console.log('Phase 3: Create transactions - done');

      // ============ STEP 4: Approve all Transactions (Signer B) ============
      console.log('Phase 4: Approve transactions - start');
      for (const { scenario, txId } of createdTxs) {
        console.log(`[${scenario.name}] Approve transaction - start`, { txId });

        const txDetails = (await apiGetTransaction(
          tokensA.accessToken,
          txId,
        )) as {
          nonce: number;
          to: string;
          value: string;
          tokenAddress?: string | null;
        };

        const votePayloadB = await generateVotePayload(
          identityB,
          accountAddress,
          BigInt(txDetails.nonce),
          txDetails.to as `0x${string}`,
          BigInt(txDetails.value),
          callData,
        );

        await apiApproveTransaction(tokensB.accessToken, txId, votePayloadB);

        console.log(`[${scenario.name}] Approve transaction - done`, {
          txId,
        });
      }
      console.log('Phase 4: Approve transactions - done');

      // ============ STEP 5: Execute all Transactions sequentially ============
      console.log('Phase 5: Execute transactions - start');
      for (const { scenario, txId } of createdTxs) {
        console.log(`[${scenario.name}] Execute transaction - start`, { txId });

        const { txHash } = await apiExecuteTransaction(
          tokensA.accessToken,
          txId,
        );
        expect(txHash).toBeDefined();

        console.log(`[${scenario.name}] Execute transaction - done`, {
          txId,
          txHash,
        });
      }
      console.log('Phase 5: Execute transactions - done');

      // ============ STEP 6: Verify Final State for each transaction ============
      console.log('Phase 6: Verify final state - start');
      const prisma = getPrismaService(getTestApp());

      for (const { scenario, amount, txId } of createdTxs) {
        const finalTx = (await prisma.transaction.findUnique({
          where: { txId: Number(txId) },
          include: { votes: true },
        })) as {
          status: TxStatus;
          votes: unknown[];
          tokenAddress: string | null;
          value: string;
        } | null;

        expect(finalTx).not.toBeNull();
        expect(finalTx!.status).toBe(TxStatus.EXECUTED);
        expect(finalTx!.votes.length).toBe(2);

        if (scenario.isNative) {
          expect(finalTx!.tokenAddress).toBeNull();
        } else {
          expect(finalTx!.tokenAddress?.toLowerCase()).toBe(
            (scenario.tokenAddress as string).toLowerCase(),
          );
        }
        expect(finalTx!.value).toBe(amount.amountString);

        console.log(`[${scenario.name}] Final verification - done`, {
          status: finalTx?.status,
          votes: finalTx?.votes.length,
          tokenAddress: finalTx?.tokenAddress,
          value: finalTx?.value,
        });
      }

      console.log('Phase 6: Verify final state - done');
      console.log('=== Multi-asset Transaction E2E: Done ===\n');
    });
  });
});
