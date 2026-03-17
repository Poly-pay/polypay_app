"use client";

import { useCallback, useRef, useState } from "react";
import { BN254_MODULUS, poseidonHash2 } from "@polypay/shared";
import { encodePacked, keccak256 } from "viem";
import { useWalletClient } from "wagmi";

const MIXER_SECRET_MESSAGE = "polypay-mixer-secret";
const FIND_DEPOSITS_BATCH_SIZE = 50;

/**
 * TODO: Mixer UX improvements (not yet implemented)
 *
 * 1. Progressive loading: Update UI after each batch instead of waiting for all.
 *    - findMyDeposits: add onBatchComplete(slots) callback or return AsyncGenerator
 *    - loadSlots: call setSlots incrementally as batches complete
 *
 * 2. localStorage cache (scope by wallet address):
 *    - Key: mixer_deposit_n:{walletAddress}:{chainId}:{poolId} -> [n1, n2, ...]
 *    - On deposit: save n used (from getNextDepositIndex)
 *    - On load: try known n first; if all match, skip scan. Fallback to scan if no cache.
 *    - Use address from useAccount/useWalletClient - when user switches wallet, different cache.
 *    - Consider Zustand store + persist if fits app patterns.
 */

export interface MixerDepositSlot {
  n: number;
  commitment: bigint;
  nullifier: bigint;
  leafIndex: number;
}

/** poolId as Field (bigint mod BN254) for nullifier derivation */
function poolIdToField(token: string, denomination: string): bigint {
  const poolId = keccak256(encodePacked(["address", "uint256"], [token as `0x${string}`, BigInt(denomination)]));
  return BigInt(poolId) % BN254_MODULUS;
}

export function useMixerKeys() {
  const { data: walletClient } = useWalletClient();
  // Use ref instead of state to avoid stale closure issues when called multiple times
  // within the same async execution (e.g., deposit flow).
  const baseSecretRef = useRef<bigint | null>(null);
  const pendingSecretRef = useRef<Promise<bigint> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deriveBaseSecret = useCallback(async (): Promise<bigint> => {
    if (!walletClient) throw new Error("Wallet not connected");
    const [account] = await walletClient.getAddresses();
    if (!account) throw new Error("No account");
    const signature = await walletClient.signMessage({
      account,
      message: MIXER_SECRET_MESSAGE,
    });
    const signatureHash = keccak256(signature);
    return BigInt(signatureHash) % BN254_MODULUS;
  }, [walletClient]);

  const ensureBaseSecret = useCallback(async (): Promise<bigint> => {
    if (baseSecretRef.current !== null) return baseSecretRef.current;
    // Deduplicate concurrent calls — only one sign request in flight at a time.
    if (pendingSecretRef.current !== null) return pendingSecretRef.current;
    setIsLoading(true);
    setError(null);
    const promise = deriveBaseSecret()
      .then(secret => {
        baseSecretRef.current = secret;
        pendingSecretRef.current = null;
        return secret;
      })
      .catch(e => {
        pendingSecretRef.current = null;
        const msg = e instanceof Error ? e.message : "Failed to derive mixer secret";
        setError(msg);
        throw e;
      })
      .finally(() => setIsLoading(false));
    pendingSecretRef.current = promise;
    return promise;
  }, [deriveBaseSecret]);

  const computeCommitmentAndNullifier = useCallback(
    async (
      secret: bigint,
      n: number,
      token: string,
      denomination: string,
    ): Promise<{ commitment: bigint; nullifier: bigint }> => {
      const poolIdField = poolIdToField(token, denomination);
      const inner = await poseidonHash2(secret, BigInt(n));
      const nullifier = await poseidonHash2(inner, poolIdField);
      const commitment = await poseidonHash2(secret, nullifier);
      return { commitment, nullifier };
    },
    [],
  );

  /**
   * Find smallest n such that commitment_n is not in the pool (for next deposit).
   */
  const getNextDepositIndex = useCallback(
    async (
      commitmentsHex: string[],
      token: string,
      denomination: string,
    ): Promise<{ n: number; commitment: bigint; nullifier: bigint }> => {
      const secret = await ensureBaseSecret();
      const set = new Set(
        commitmentsHex.map(c => (c.startsWith("0x") ? BigInt(c).toString() : BigInt("0x" + c).toString())),
      );
      for (let n = 0; ; n++) {
        const { commitment, nullifier } = await computeCommitmentAndNullifier(secret, n, token, denomination);
        const key = commitment.toString();
        if (!set.has(key)) return { n, commitment, nullifier };
      }
    },
    [ensureBaseSecret, computeCommitmentAndNullifier],
  );

  /**
   * Find all n such that commitment_n is in the pool; returns slots with leafIndex from the index list.
   * Uses parallel batches to speed up scanning.
   */
  const findMyDeposits = useCallback(
    async (
      commitmentsHex: string[],
      leafIndices: number[],
      token: string,
      denomination: string,
    ): Promise<MixerDepositSlot[]> => {
      if (commitmentsHex.length !== leafIndices.length) return [];
      const secret = await ensureBaseSecret();
      const commitmentToLeafIndex = new Map<string, number>();
      commitmentsHex.forEach((c, i) => {
        const key = c.startsWith("0x") ? BigInt(c).toString() : BigInt("0x" + c).toString();
        commitmentToLeafIndex.set(key, leafIndices[i]);
      });
      const result: MixerDepositSlot[] = [];
      const maxN = Math.max(commitmentsHex.length * 2, 100);
      for (let start = 0; start < maxN; start += FIND_DEPOSITS_BATCH_SIZE) {
        const batch = Array.from({ length: FIND_DEPOSITS_BATCH_SIZE }, (_, i) => start + i)
          .filter(n => n < maxN)
          .map(n => computeCommitmentAndNullifier(secret, n, token, denomination).then(r => ({ n, ...r })));
        const batchResults = await Promise.all(batch);
        for (const { n, commitment, nullifier } of batchResults) {
          const key = commitment.toString();
          const leafIndex = commitmentToLeafIndex.get(key);
          if (leafIndex !== undefined) {
            result.push({ n, commitment, nullifier, leafIndex });
          }
        }
      }
      return result.sort((a, b) => a.leafIndex - b.leafIndex);
    },
    [ensureBaseSecret, computeCommitmentAndNullifier],
  );

  const reset = useCallback(() => {
    baseSecretRef.current = null;
    pendingSecretRef.current = null;
    setError(null);
  }, []);

  return {
    ensureBaseSecret,
    getNextDepositIndex,
    findMyDeposits,
    deriveBaseSecret,
    isLoading,
    error,
    reset,
    isReady: !!walletClient,
  };
}
