"use client";

import { useCallback, useState } from "react";
import { keccak256 } from "viem";
import { useWalletClient } from "wagmi";
import { BN254_MODULUS, poseidonHash2 } from "@polypay/shared";

const MIXER_SECRET_MESSAGE = "polypay-mixer-secret";

export interface MixerDepositSlot {
  n: number;
  commitment: bigint;
  nullifier: bigint;
  leafIndex: number;
}

export function useMixerKeys() {
  const { data: walletClient } = useWalletClient();
  const [baseSecret, setBaseSecret] = useState<bigint | null>(null);
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
    if (baseSecret !== null) return baseSecret;
    setIsLoading(true);
    setError(null);
    try {
      const secret = await deriveBaseSecret();
      setBaseSecret(secret);
      return secret;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to derive mixer secret";
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [baseSecret, deriveBaseSecret]);

  const computeCommitmentAndNullifier = useCallback(
    async (secret: bigint, n: number): Promise<{ commitment: bigint; nullifier: bigint }> => {
      const nullifier = await poseidonHash2(secret, BigInt(n));
      const commitment = await poseidonHash2(secret, nullifier);
      return { commitment, nullifier };
    },
    [],
  );

  /**
   * Find smallest n such that commitment_n is not in the pool (for next deposit).
   */
  const getNextDepositIndex = useCallback(
    async (commitmentsHex: string[]): Promise<{ n: number; commitment: bigint; nullifier: bigint }> => {
      const secret = await ensureBaseSecret();
      const set = new Set(commitmentsHex.map((c) => (c.startsWith("0x") ? BigInt(c).toString() : BigInt("0x" + c).toString())));
      for (let n = 0; ; n++) {
        const { commitment, nullifier } = await computeCommitmentAndNullifier(secret, n);
        const key = commitment.toString();
        if (!set.has(key)) return { n, commitment, nullifier };
      }
    },
    [ensureBaseSecret, computeCommitmentAndNullifier],
  );

  /**
   * Find all n such that commitment_n is in the pool; returns slots with leafIndex from the index list.
   */
  const findMyDeposits = useCallback(
    async (
      commitmentsHex: string[],
      leafIndices: number[],
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
      for (let n = 0; n < maxN; n++) {
        const { commitment, nullifier } = await computeCommitmentAndNullifier(secret, n);
        const key = commitment.toString();
        const leafIndex = commitmentToLeafIndex.get(key);
        if (leafIndex !== undefined) {
          result.push({ n, commitment, nullifier, leafIndex });
        }
      }
      return result.sort((a, b) => a.leafIndex - b.leafIndex);
    },
    [ensureBaseSecret, computeCommitmentAndNullifier],
  );

  const reset = useCallback(() => {
    setBaseSecret(null);
    setError(null);
  }, []);

  return {
    ensureBaseSecret,
    getNextDepositIndex,
    findMyDeposits,
    deriveBaseSecret,
    baseSecret,
    isLoading,
    error,
    reset,
    isReady: !!walletClient,
  };
}
