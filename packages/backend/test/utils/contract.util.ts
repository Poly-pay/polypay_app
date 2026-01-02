import { createPublicClient, http, type Hex, parseEther } from 'viem';
import { horizenTestnet, METAMULTISIG_ABI } from '@polypay/shared';
import { TestSigner } from './signer.util';
import { waitForReceiptWithRetry } from '@/common/constants/utils/retry';

/**
 * Create public client for reading contract
 */
export function createTestPublicClient() {
  return createPublicClient({
    chain: horizenTestnet,
    transport: http(),
  });
}

/**
 * Get transaction hash from contract
 * @param walletAddress - Wallet contract address
 * @param nonce - Transaction nonce
 * @param to - Recipient address
 * @param value - Value in wei
 * @param data - Call data (0x for ETH transfer)
 * @returns Transaction hash
 */
export async function getTransactionHash(
  walletAddress: `0x${string}`,
  nonce: bigint,
  to: `0x${string}`,
  value: bigint,
  data: Hex = '0x',
): Promise<Hex> {
  const publicClient = createTestPublicClient();

  const txHash = await publicClient.readContract({
    address: walletAddress,
    abi: METAMULTISIG_ABI,
    functionName: 'getTransactionHash',
    args: [nonce, to, value, data],
  });

  return txHash as Hex;
}

/**
 * Deposit ETH to multisig wallet
 * @param signer - Test signer who will send ETH
 * @param walletAddress - Multisig wallet address
 * @param amount - Amount in ETH (e.g., "0.01")
 * @returns Transaction hash
 */
export async function depositToWallet(
  signer: TestSigner,
  walletAddress: `0x${string}`,
  amount: string,
): Promise<Hex> {
  const hash = await signer.walletClient.sendTransaction({
    account: signer.account,
    to: walletAddress,
    value: parseEther(amount),
  } as any);

  // Wait for confirmation
  const publicClient = createTestPublicClient();
  await waitForReceiptWithRetry(publicClient as any, hash);

  return hash;
}

/**
 * Get wallet ETH balance
 * @param walletAddress - Wallet address
 * @returns Balance in wei
 */
export async function getWalletBalance(
  walletAddress: `0x${string}`,
): Promise<bigint> {
  const publicClient = createTestPublicClient();
  return await publicClient.getBalance({ address: walletAddress });
}
