"use client";

import { useCallback } from "react";
import { useMetaMultiSigWallet } from "./useMetaMultiSigWallet";
import { type Hex } from "viem";
import { useWalletClient } from "wagmi";
import { useIdentityStore } from "~~/services/store/useIdentityStore";
import { getPublicKeyXY, hexToByteArray, poseidonHash2 } from "~~/utils/multisig";

export interface GenerateProofResult {
  proof: number[];
  publicInputs: string[];
  nullifier: string;
  commitment: string;
  vk?: any;
}

export interface UseGenerateProofOptions {
  onLoadingStateChange?: (state: string) => void;
}

export function useGenerateProof(options?: UseGenerateProofOptions) {
  const { data: walletClient } = useWalletClient();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { secret, commitment } = useIdentityStore();

  const { onLoadingStateChange } = options || {};

  const setLoadingState = useCallback(
    (state: string) => {
      onLoadingStateChange?.(state);
    },
    [onLoadingStateChange],
  );

  const generateProof = useCallback(
    async (txHash: Hex): Promise<GenerateProofResult> => {
      if (!walletClient) {
        throw new Error("Wallet not connected");
      }

      if (!metaMultiSigWallet) {
        throw new Error("MetaMultiSigWallet not available");
      }

      if (!secret) {
        throw new Error("No secret found. Please create identity first.");
      }

      if (!commitment) {
        throw new Error("No commitment found. Please create identity first.");
      }

      // 1. Verify user is a signer (This is not a proof step, just a UX check. We will check on-chain again)
      const commitments = await metaMultiSigWallet.read.getCommitments();
      const isSigner = (commitments ?? []).some(c => BigInt(c) === BigInt(commitment));

      if (!isSigner) {
        throw new Error("You are not a signer of this wallet");
      }

      // 2. Sign txHash
      setLoadingState("Signing transaction...");
      const signature = await walletClient.signMessage({
        message: { raw: txHash },
      });
      const { pubKeyX, pubKeyY } = await getPublicKeyXY(signature, txHash);

      // 3. Calculate values
      const txHashBytes = hexToByteArray(txHash);
      const sigBytes = hexToByteArray(signature).slice(0, 64);
      const txHashCommitment = await poseidonHash2(BigInt(txHash), 1n);
      const nullifier = await poseidonHash2(BigInt(secret), BigInt(txHash));

      // 4. Load circuit
      const circuit_json = await fetch("/circuit/target/circuit.json");
      const noir_data = await circuit_json.json();
      const { bytecode, abi } = noir_data;

      // 5. Dynamic import Noir libraries
      setLoadingState("Loading ZK libraries...");
      const [{ Noir }, { UltraPlonkBackend }] = await Promise.all([
        import("@noir-lang/noir_js"),
        import("@aztec/bb.js"),
      ]);

      // 6. Execute Noir circuit
      const input = {
        signature: sigBytes,
        pub_key_x: pubKeyX,
        pub_key_y: pubKeyY,
        secret: secret,
        tx_hash_bytes: txHashBytes,
        tx_hash_commitment: txHashCommitment.toString(),
        commitment: commitment,
        nullifier: nullifier.toString(),
      };

      const noir = new Noir({ bytecode, abi } as any);
      const execResult = await noir.execute(input);

      // 7. Generate proof
      setLoadingState("Generating ZK proof...");
      const plonk = new UltraPlonkBackend(bytecode, { threads: 2 });
      const { proof, publicInputs } = await plonk.generateProof(execResult.witness);
      // const vk = await plonk.getVerificationKey();

      setLoadingState("");

      return {
        proof: Array.from(proof),
        publicInputs,
        nullifier: nullifier.toString(),
        commitment,
        // vk
      };
    },
    [walletClient, metaMultiSigWallet, secret, commitment, setLoadingState],
  );

  return {
    generateProof,
    isReady: !!walletClient && !!metaMultiSigWallet && !!secret && !!commitment,
  };
}
