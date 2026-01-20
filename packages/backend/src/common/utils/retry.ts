import { type Hex, type PublicClient } from 'viem';

/**
 * Sleep for a specified duration
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for transaction receipt with retry logic
 * @param publicClient - Viem public client
 * @param txHash - Transaction hash
 * @param maxRetries - Maximum retry attempts
 * @returns Transaction receipt
 */
export async function waitForReceiptWithRetry(
  publicClient: PublicClient,
  txHash: Hex,
  maxRetries: number = 5,
): Promise<any> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      return receipt;
    } catch (error: any) {
      lastError = error;

      const isRetryable =
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ECONNREFUSED' ||
        error.message?.includes('timeout') ||
        error.message?.includes('network') ||
        error.message?.includes('connection');

      if (!isRetryable || attempt === maxRetries) {
        console.error(
          `waitForReceipt failed after ${attempt} attempts: ${error.message}`,
        );
        throw error;
      }

      const delay = Math.pow(2, attempt) * 1000;
      console.warn(
        `waitForReceipt attempt ${attempt} failed, retrying in ${delay}ms: ${error.code || error.message}`,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}
