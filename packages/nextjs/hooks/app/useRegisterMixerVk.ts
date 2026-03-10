"use client";

import { useCallback, useState } from "react";
import { poseidonHash2 } from "@polypay/shared";
import { IncrementalMerkleTree } from "@polypay/shared";
import { mixerApi } from "~~/services/api/mixerApi";

// TODO: remove this hook
/**
 * Generates mixer VK with mock data and registers it on Kurier.
 * Use before deploying Mixer contract to get vkHash for contracts-config.
 */
export function useRegisterMixerVk() {
  const [loadingState, setLoadingState] = useState("");
  const [vkHash, setVkHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async () => {
    setError(null);
    setVkHash(null);
    setLoadingState("Loading circuit...");

    const circuitRes = await fetch("/mixer-circuit/target/mixer_circuit.json");
    const noirData = await circuitRes.json();
    const { bytecode, abi } = noirData;

    setLoadingState("Building mock Merkle tree...");
    const secret = 1n;
    const nullifier = 2n;
    const commitment = await poseidonHash2(secret, nullifier);
    const nullifierHash = await poseidonHash2(nullifier, nullifier);

    const tree = new IncrementalMerkleTree();
    await tree.insert(commitment);
    const root = await tree.getRoot();
    const { siblings, pathIndices } = await tree.getMerklePath(0);

    const recipientField = 1n;
    const tokenField = 2n;
    const denomField = 1n;

    const circuitInput = {
      secret: secret.toString(),
      nullifier: nullifier.toString(),
      merkle_path: siblings.map((s) => s.toString()),
      path_indices: pathIndices.map((i) => i.toString()),
      merkle_root: root.toString(),
      nullifier_hash: nullifierHash.toString(),
      recipient: recipientField.toString(),
      token_address: tokenField.toString(),
      denomination: denomField.toString(),
    };

    setLoadingState("Loading ZK libraries...");
    const [{ Noir }, { UltraPlonkBackend }] = await Promise.all([
      import("@noir-lang/noir_js"),
      import("@aztec/bb.js"),
    ]);

    setLoadingState("Executing circuit...");
    const noir = new Noir({ bytecode, abi } as any);
    const execResult = await noir.execute(circuitInput);

    setLoadingState("Generating proof & VK...");
    const plonk = new UltraPlonkBackend(bytecode, { threads: 2 });
    await plonk.generateProof(execResult.witness);
    const vk = await plonk.getVerificationKey();

    setLoadingState("Registering VK on Kurier...");
    const result = await mixerApi.registerVk(Buffer.from(vk).toString("base64")); // TODO: change to actual vk

    setVkHash(result.vkHash);
    setLoadingState("");
    return result.vkHash;
  }, []);

  return {
    register,
    loadingState,
    vkHash,
    error,
    setError,
  };
}
