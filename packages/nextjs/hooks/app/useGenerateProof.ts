"use client";

import { useCallback } from "react";
import { useMetaMultiSigWallet } from "./useMetaMultiSigWallet";
import { useNetworkGuard } from "./useNetworkGuard";
import { ULTRAHONK_CONTRACT_VERSION, getPublicKeyXY, hexToByteArray, poseidonHash2 } from "@polypay/shared";
import { type Hex } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { useAccountStore } from "~~/services/store";
import { useIdentityStore } from "~~/services/store/useIdentityStore";
import { getNetworkMeta } from "~~/utils/network";

export interface GenerateProofResult {
  proof: number[];
  publicInputs: string[];
  nullifier: string;
  commitment: string;
  vk?: string;
}

export interface UseGenerateProofOptions {
  onLoadingStateChange?: (state: string) => void;
}

export function useGenerateProof(options?: UseGenerateProofOptions) {
  const { data: walletClient } = useWalletClient();
  const metaMultiSigWallet = useMetaMultiSigWallet();
  const { secret, commitment } = useIdentityStore();
  const { currentAccount } = useAccountStore();
  const { chain } = useAccount();
  const { isWrongNetwork, targetChainId } = useNetworkGuard();

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

      // Ensure wallet is on the same network as the current account before signing.
      if (currentAccount?.chainId) {
        const effectiveTargetChainId = targetChainId ?? currentAccount.chainId;
        if (isWrongNetwork || chain?.id !== effectiveTargetChainId) {
          const meta = getNetworkMeta(effectiveTargetChainId);
          throw new Error(`You're on the wrong network. Please switch your wallet to ${meta.name} and try again.`);
        }
      }

      // 1. Verify user is a signer (This is not a proof step, just a UX check. We will check on-chain again)
      const commitments = await metaMultiSigWallet.read.getCommitments();
      const isSigner = (commitments ?? []).some(c => BigInt(c) === BigInt(commitment));

      if (!isSigner) {
        throw new Error("You are not a signer of this account");
      }

      // 2. Sign txHash
      setLoadingState("Waiting for wallet approval...");
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
      const { Noir } = await import("@noir-lang/noir_js");

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

      // 7. Generate proof — use UltraHonk for contractVersion >= 2
      setLoadingState("Securing your transaction...");
      let proof: Uint8Array;
      let publicInputs: string[];
      let vk: string | undefined;

      if (currentAccount?.contractVersion && currentAccount.contractVersion >= ULTRAHONK_CONTRACT_VERSION) {
        const { UltraHonkBackend } = await import("@aztec/bb.js");
        const backend = new UltraHonkBackend(bytecode, { threads: 2 });
        ({ proof, publicInputs } = await backend.generateProof(execResult.witness, { keccak: true }));
        const rawVk = await backend.getVerificationKey({ keccak: true });
        vk = "0x" + Buffer.from(rawVk).toString("hex");
      } else {
        const { UltraPlonkBackend } = await import("@aztec/bb.js");
        const backend = new UltraPlonkBackend(bytecode, { threads: 2 });
        ({ proof, publicInputs } = await backend.generateProof(execResult.witness));
        const rawVk = await backend.getVerificationKey();
        vk = Buffer.from(rawVk).toString("base64");
      }

      setLoadingState("");

      return {
        proof: Array.from(proof),
        publicInputs,
        nullifier: nullifier.toString(),
        commitment,
        vk,
      };
    },
    [
      walletClient,
      metaMultiSigWallet,
      secret,
      commitment,
      setLoadingState,
      chain?.id,
      currentAccount?.chainId,
      currentAccount?.contractVersion,
      isWrongNetwork,
      targetChainId,
    ],
  );

  return {
    generateProof,
    isReady: !!walletClient && !!metaMultiSigWallet && !!secret && !!commitment,
  };
}
