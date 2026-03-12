import { type Hex, formatEther, parseEther } from 'viem';
import {
  encodeERC20Transfer,
  encodeBatchTransferMulti,
  formatTokenAmount,
  ZEN_TOKEN,
  USDC_TOKEN,
  ZERO_ADDRESS,
} from '@polypay/shared';
import { depositToAccount, getAccountBalance } from './contract.util';
import {
  toTokenAmount,
  transferErc20FromSigner,
  getErc20Balance,
} from './transaction.util';
import type { TestIdentity } from './identity.util';

export const TEST_CHAIN_ID = 2651420;
export const TEST_TRANSFER_AMOUNT = '0.0001';
export const TEST_FUND_ETH_AMOUNT = '0.0003';
export const TEST_FUND_ERC20_MULTIPLIER = 2;
export const TEST_RECIPIENT =
  '0x87142a49c749dD05069836F9B81E5579E95BE0A6' as `0x${string}`;
export const TEST_THRESHOLD = 2;

export type AssetName = 'ETH' | 'ZEN' | 'USDC';

export interface AssetScenario {
  name: AssetName;
  isNative: boolean;
  tokenAddress: `0x${string}` | null;
  decimals: number;
}

export const SCENARIOS: AssetScenario[] = [
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

export interface ScenarioAmount {
  scenario: AssetScenario;
  amountBigInt: bigint;
  amountString: string;
}

export type CreatedTx =
  | {
      kind: 'single';
      scenario: AssetScenario;
      amount: ScenarioAmount;
      txId: string;
    }
  | { kind: 'batch'; txId: string };

export interface ParsedBatchItem {
  recipient: string;
  amount: string;
  tokenAddress?: string | null;
}

export function getCreatedTxLabel(entry: CreatedTx): string {
  return entry.kind === 'single' ? entry.scenario.name : 'batch';
}

/** Match frontend: ETH = (recipient, value, 0x); ERC20 = (tokenAddress, 0, encodeERC20Transfer) */
export function buildSingleTransferParams(
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

/** Build approve params from API tx details (single transfer). */
export function buildSingleApproveParams(txDetails: {
  to?: string;
  value?: string;
  tokenAddress?: string | null;
}): { to: `0x${string}`; value: bigint; callData: Hex } {
  if (txDetails.to === undefined || txDetails.value === undefined) {
    throw new Error('Single transfer txDetails must have to and value');
  }
  const to = (txDetails.tokenAddress ?? txDetails.to) as `0x${string}`;
  const value = txDetails.tokenAddress ? 0n : BigInt(txDetails.value);
  const callData = txDetails.tokenAddress
    ? (encodeERC20Transfer(txDetails.to, BigInt(txDetails.value)) as Hex)
    : ('0x' as Hex);
  return { to, value, callData };
}

export function buildBatchCallData(
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

export function buildBatchCallDataFromParsed(
  parsedBatch: ParsedBatchItem[],
): Hex {
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
 * Returns ScenarioAmount for one transfer (0.0001) used by both single tx and batch item.
 */
export async function fundAccountForScenario(
  scenario: AssetScenario,
  accountAddress: `0x${string}`,
  identityA: TestIdentity,
): Promise<ScenarioAmount> {
  if (scenario.isNative) {
    const balanceBefore = await getAccountBalance(accountAddress);
    await depositToAccount(
      identityA.signer,
      accountAddress,
      TEST_FUND_ETH_AMOUNT,
    );
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
    throw new Error(
      `Token address is required for ERC20 scenario: ${scenario.name}`,
    );
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
