"use client";

import { useCallback, useState } from "react";
import { useMerkleTree } from "./useMerkleTree";
import { type MixerDepositSlot, useMixerKeys } from "./useMixerKeys";
import { MIXER_ABI, getContractConfigByChainId, poseidonHash2 } from "@polypay/shared";
import { encodePacked, keccak256 } from "viem";
import { usePublicClient } from "wagmi";
import { mixerApi } from "~~/services/api/mixerApi";

function bigintToHex(v: bigint): string {
  const hex = v.toString(16).padStart(64, "0");
  return "0x" + hex;
}

export interface MixerWithdrawParams {
  chainId: number;
  token: string;
  denomination: string;
  recipient: string;
  slot: MixerDepositSlot;
  /** Pass commitments from a previous getWithdrawableSlots call to avoid double fetch */
  commitments?: string[];
}

function getPoolId(token: string, denomination: string): `0x${string}` {
  return keccak256(
    encodePacked(["address", "uint256"], [token as `0x${string}`, BigInt(denomination)]),
  ) as `0x${string}`;
}

function bigintToBytes32(v: bigint): `0x${string}` {
  return ("0x" + v.toString(16).padStart(64, "0")) as `0x${string}`;
}

export function useMixerWithdraw() {
  const publicClient = usePublicClient();
  const { ensureBaseSecret, findMyDeposits, isReady: keysReady } = useMixerKeys();
  const { getRootAndPath } = useMerkleTree();
  const [loadingState, setLoadingState] = useState("");
  const [error, setError] = useState<string | null>(null);

  const getWithdrawableSlots = useCallback(
    async (
      chainId: number,
      token: string,
      denomination: string,
    ): Promise<{ slots: MixerDepositSlot[]; commitments: string[] }> => {
      const config = getContractConfigByChainId(chainId);
      if (!config.mixerAddress || config.mixerAddress === "0x0000000000000000000000000000000000000000") {
        return { slots: [], commitments: [] };
      }
      if (!publicClient) return { slots: [], commitments: [] };
      const { commitments, leafIndices } = await mixerApi.getDeposits({
        chainId,
        token,
        denomination,
      });
      const allSlots = await findMyDeposits(commitments, leafIndices, token, denomination);
      const poolId = getPoolId(token, denomination);
      const withdrawable: MixerDepositSlot[] = [];
      for (const slot of allSlots) {
        const nullifierHash = await poseidonHash2(slot.nullifier, slot.nullifier);
        const used = await publicClient.readContract({
          address: config.mixerAddress,
          abi: MIXER_ABI,
          functionName: "nullifierUsed",
          args: [poolId, bigintToBytes32(nullifierHash)],
        });
        if (!used) withdrawable.push(slot);
      }
      return { slots: withdrawable, commitments };
    },
    [publicClient, findMyDeposits],
  );

  const withdraw = useCallback(
    async (params: MixerWithdrawParams): Promise<{ txHash: string; status: string }> => {
      setError(null);
      const { chainId, token, denomination, recipient, slot } = params;

      setLoadingState("Preparing...");
      const secret = await ensureBaseSecret();

      setLoadingState("Fetching deposits...");
      const resolvedCommitments =
        params.commitments ??
        (await mixerApi.getDeposits({ chainId, token, denomination })).commitments;

      setLoadingState("Building Merkle path...");
      const { root, siblings, pathIndices } = await getRootAndPath(resolvedCommitments, slot.leafIndex);
      const nullifierHash = await poseidonHash2(slot.nullifier, slot.nullifier);

      const recipientField = BigInt(recipient);
      const tokenField = BigInt(token);
      const denomField = BigInt(denomination);

      const circuitInput = {
        secret: secret.toString(),
        nullifier: slot.nullifier.toString(),
        merkle_path: siblings.map(s => s.toString()),
        path_indices: pathIndices.map(i => i.toString()),
        merkle_root: root.toString(),
        nullifier_hash: nullifierHash.toString(),
        recipient: recipientField.toString(),
        token_address: tokenField.toString(),
        denomination: denomField.toString(),
      };

      setLoadingState("Loading ZK libraries...");
      const circuitRes = await fetch("/mixer-circuit/target/mixer_circuit.json");
      const noirData = await circuitRes.json();
      const { bytecode, abi } = noirData;

      const [{ Noir }, { UltraPlonkBackend }] = await Promise.all([
        import("@noir-lang/noir_js"),
        import("@aztec/bb.js"),
      ]);

      setLoadingState("Executing circuit...");
      const noir = new Noir({ bytecode, abi } as any);
      const execResult = await noir.execute(circuitInput);

      setLoadingState("Generating ZK proof...");
      const plonk = new UltraPlonkBackend(bytecode, { threads: 2 });
      const { proof, publicInputs } = await plonk.generateProof(execResult.witness);
      const vk = await plonk.getVerificationKey();

      setLoadingState("Submitting withdraw...");
      const result = await mixerApi.withdraw({
        chainId,
        token,
        denomination,
        recipient,
        nullifierHash: bigintToHex(nullifierHash),
        root: bigintToHex(root),
        proof: Array.from(proof),
        publicInputs,
        vk: Buffer.from(vk).toString("base64"),
      });

      setLoadingState("");
      return result;
    },
    [ensureBaseSecret, getRootAndPath],
  );

  return {
    withdraw,
    getWithdrawableSlots,
    findMyDeposits,
    loadingState,
    error,
    setError,
    isReady: keysReady,
  };
}
