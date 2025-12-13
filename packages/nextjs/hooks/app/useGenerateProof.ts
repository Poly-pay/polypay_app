import { useCallback } from "react";
import { Noir } from "@noir-lang/noir_js";
import { UltraPlonkBackend } from "@aztec/bb.js";
import { type Hex } from "viem";
import { useWalletClient } from "wagmi";
import { useIdentityStore } from "~~/services/store/useIdentityStore";
import {
  buildMerkleTree,
  getMerklePath,
  getPublicKeyXY,
  hexToByteArray,
  poseidonHash2,
} from "~~/utils/multisig";
import { useMetaMultiSigWallet } from "./useMetaMultiSigWallet";

export interface GenerateProofResult {
  proof: number[];
  publicInputs: string[];
  nullifier: string;
  commitment: string;
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
    [onLoadingStateChange]
  );

  const generateProof = useCallback(
    async (txHash: Hex): Promise<GenerateProofResult> => {
      // Validate dependencies
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

      // 1. Sign txHash
      setLoadingState("Signing transaction...");
      const signature = await walletClient.signMessage({
        message: { raw: txHash },
      });
      const { pubKeyX, pubKeyY } = await getPublicKeyXY(signature, txHash);

      // 2. Calculate values
      const txHashBytes = hexToByteArray(txHash);
      const sigBytes = hexToByteArray(signature).slice(0, 64);
      const txHashCommitment = await poseidonHash2(BigInt(txHash), 1n);
      const nullifier = await poseidonHash2(BigInt(secret), BigInt(txHash));

      // 3. Get merkle data
      setLoadingState("Building merkle tree...");
      const commitments = await metaMultiSigWallet.read.getCommitments();
      const tree = await buildMerkleTree(commitments ?? []);
      const merkleRoot = await metaMultiSigWallet.read.merkleRoot();

      const leafIndex = (commitments ?? []).findIndex(
        (c) => BigInt(c) === BigInt(commitment)
      );

      if (leafIndex === -1) {
        throw new Error("You are not a signer of this wallet");
      }

      const merklePath = getMerklePath(tree, leafIndex);

      // 4. Load circuit
      setLoadingState("Loading circuit...");
      const circuit_json = await fetch("/circuit/target/circuit.json");
      const noir_data = await circuit_json.json();
      const { bytecode, abi } = noir_data;

      // 5. Execute Noir circuit
      setLoadingState("Executing circuit...");
      const input = {
        signature: sigBytes,
        pub_key_x: pubKeyX,
        pub_key_y: pubKeyY,
        secret: secret,
        leaf_index: leafIndex,
        merkle_path: merklePath.map((p) => p.toString()),
        tx_hash_bytes: txHashBytes,
        tx_hash_commitment: txHashCommitment.toString(),
        merkle_root: merkleRoot?.toString() ?? "",
        nullifier: nullifier.toString(),
      };

      const noir = new Noir({ bytecode, abi } as any);
      const execResult = await noir.execute(input);

      // 6. Generate proof
      setLoadingState("Generating ZK proof...");
      const plonk = new UltraPlonkBackend(bytecode, { threads: 2 });
      const { proof, publicInputs } = await plonk.generateProof(execResult.witness);

      setLoadingState("");

      return {
        proof: Array.from(proof),
        publicInputs,
        nullifier: nullifier.toString(),
        commitment,
      };
    },
    [walletClient, metaMultiSigWallet, secret, commitment, setLoadingState]
  );

  return {
    generateProof,
    isReady: !!walletClient && !!metaMultiSigWallet && !!secret && !!commitment,
  };
}
