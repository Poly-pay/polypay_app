import { useState } from "react";
import { keccak256 } from "viem";
import { useWalletClient } from "wagmi";
import { useIdentityStore } from "~~/services/store";
import { BN254_MODULUS, createCommitment, createSecret, poseidonHash2 } from "~~/utils/multisig";

interface AuthProofResult {
  commitment: string;
  proof: number[];
  publicInputs: string[];
  vk?: any;
}

export const useAuthProof = () => {
  const { data: walletClient } = useWalletClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { secret, commitment, setIdentity } = useIdentityStore();

  const generateAuthProof = async (): Promise<AuthProofResult | null> => {
    if (!walletClient) {
      setError("Wallet not connected");
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // 1. Sign identity message
      const [account] = await walletClient.getAddresses();
      const secret = await createSecret(walletClient);
      const commitment = await createCommitment(secret);

      // Save to store
      setIdentity(secret.toString(), commitment.toString());

      // 3. Load auth circuit
      const circuitResponse = await fetch("/auth-circuit/target/circuit.json");
      const circuitData = await circuitResponse.json();
      const { bytecode, abi } = circuitData;

      // 4. Prepare circuit inputs
      const circuitInputs = {
        secret: secret.toString(),
        commitment: commitment.toString(),
      };

      // 5. Generate proof
      const [{ Noir }, { UltraPlonkBackend }] = await Promise.all([
        import("@noir-lang/noir_js"),
        import("@aztec/bb.js"),
      ]);

      const backend = new UltraPlonkBackend(bytecode);
      const noir = new Noir({ bytecode, abi } as any);

      const { witness } = await noir.execute(circuitInputs);
      const { proof, publicInputs } = await backend.generateProof(witness);
      const vk = await backend.getVerificationKey();

      // 6. Format output
      const proofArray = Array.from(proof);

      return {
        commitment: commitment.toString(),
        proof: proofArray,
        publicInputs,
        vk,
      };
    } catch (err: any) {
      setError(err.message || "Failed to generate auth proof");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateAuthProof,
    isGenerating,
    error,
  };
};
