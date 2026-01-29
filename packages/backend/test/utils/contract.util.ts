import { createPublicClient, http, type Hex, parseEther } from 'viem';
import { horizenMainnet, horizenTestnet, METAMULTISIG_ABI, NetworkValue } from '@polypay/shared';
import { TestSigner } from './signer.util';
import { waitForReceiptWithRetry } from '@/common/utils/retry';

/**
 * Create public client for reading contract
 */
export function createTestPublicClient() {
  const network = process.env.NETWORK;
  return createPublicClient({
    chain: network === NetworkValue.mainnet ? horizenMainnet : horizenTestnet,
    transport: http(),
  });
}

/**
 * Get transaction hash from contract
 * @param accountAddress - Account contract address
 * @param nonce - Transaction nonce
 * @param to - Recipient address
 * @param value - Value in wei
 * @param data - Call data (0x for ETH transfer)
 * @returns Transaction hash
 */
export async function getTransactionHash(
  accountAddress: `0x${string}`,
  nonce: bigint,
  to: `0x${string}`,
  value: bigint,
  data: Hex = '0x',
): Promise<Hex> {
  const publicClient = createTestPublicClient();

  const txHash = await publicClient.readContract({
    address: accountAddress,
    abi: METAMULTISIG_ABI,
    functionName: 'getTransactionHash',
    args: [nonce, to, value, data],
  });

  return txHash as Hex;
}

/**
 * Deposit ETH to multisig account
 * @param signer - Test signer who will send ETH
 * @param accountAddress - Multisig account address
 * @param amount - Amount in ETH (e.g., "0.01")
 * @returns Transaction hash
 */
export async function depositToAccount(
  signer: TestSigner,
  accountAddress: `0x${string}`,
  amount: string,
): Promise<Hex> {
  const hash = await signer.walletClient.sendTransaction({
    account: signer.account,
    to: accountAddress,
    value: parseEther(amount),
  } as any);

  // Wait for confirmation
  const publicClient = createTestPublicClient();
  await waitForReceiptWithRetry(publicClient as any, hash);

  return hash;
}

/**
 * Get account ETH balance
 * @param accountAddress - Account address
 * @returns Balance in wei
 */
export async function getAccountBalance(
  accountAddress: `0x${string}`,
): Promise<bigint> {
  const publicClient = createTestPublicClient();
  return await publicClient.getBalance({ address: accountAddress });
}
