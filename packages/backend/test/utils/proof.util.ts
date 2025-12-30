import { type Hex, keccak256 } from "viem";
import * as fs from "fs";
import * as path from "path";
import {
  poseidonHash2,
  hexToByteArray,
  getPublicKeyXY,
  BN254_MODULUS,
} from "@polypay/shared";
import { TestSigner, signRawMessage } from "./signer.util";

/**
 * Proof generation result
 */
export interface ProofResult {
  proof: number[];
  publicInputs: string[];
  nullifier: string;
  commitment: string;
}

/**
 * Load circuit from JSON file
 * @returns Circuit data with bytecode and abi
 */
function loadCircuit(): { bytecode: string; abi: any } {
  const circuitPath = path.join(__dirname, "../circuit/circuit.json");

  if (!fs.existsSync(circuitPath)) {
    throw new Error(`Circuit file not found at: ${circuitPath}`);
  }

  const circuitData = JSON.parse(fs.readFileSync(circuitPath, "utf-8"));
  return {
    bytecode: circuitData.bytecode,
    abi: circuitData.abi,
  };
}

/**
 * Generate proof for a transaction
 * @param signer - Test signer
 * @param secret - Signer's secret
 * @param txHash - Transaction hash to sign
 * @returns ProofResult with proof, publicInputs, nullifier, commitment
 */
export async function generateTestProof(
  signer: TestSigner,
  secret: bigint,
  txHash: Hex
): Promise<ProofResult> {
  // 1. Sign txHash (local signing, no RPC)
  const signature = await signRawMessage(signer, txHash);

  // 2. Get public key X, Y
  const { pubKeyX, pubKeyY } = await getPublicKeyXY(signature, txHash);

  // 3. Compute commitment and nullifier
  const commitment = await poseidonHash2(secret, secret);
  const txHashField = BigInt(txHash) % BN254_MODULUS;
  const nullifier = await poseidonHash2(secret, txHashField);

  // 4. Compute tx_hash_commitment
  const txHashBytes = hexToByteArray(txHash);
  const txHashBigInt = BigInt(txHash);
  const txHashCommitment = await poseidonHash2(txHashBigInt, 1n);

  // 5. Prepare circuit inputs
  const sigBytes = hexToByteArray(signature).slice(0, 64);

  const circuitInputs = {
    signature: sigBytes,
    pub_key_x: pubKeyX,
    pub_key_y: pubKeyY,
    secret: secret.toString(),
    tx_hash_bytes: txHashBytes,
    tx_hash_commitment: txHashCommitment.toString(),
    commitment: commitment.toString(),
    nullifier: nullifier.toString(),
  };

  // 6. Load circuit and generate proof
  const { bytecode, abi } = loadCircuit();

  // Dynamic import Noir libraries
  const { Noir } = await import("@noir-lang/noir_js");
  const { UltraPlonkBackend } = await import("@aztec/bb.js");

  // Initialize Noir and backend
  const backend = new UltraPlonkBackend(bytecode);
  const noir = new Noir({ bytecode, abi } as any);

  // Execute circuit
  const { witness } = await noir.execute(circuitInputs);

  // Generate proof
  const {proof, publicInputs} = await backend.generateProof(witness);

  // 7. Format output
  const proofArray = Array.from(proof);

  return {
    proof: proofArray,
    publicInputs: publicInputs,
    nullifier: nullifier.toString(),
    commitment: commitment.toString(),
  };
}

/**
 * Generate secret from signer (local signing, no RPC)
 * @param signer - Test signer
 * @returns Secret as bigint
 */
export async function generateSecret(signer: TestSigner): Promise<bigint> {
  const message = "noir-identity";

  // Local signing - no RPC call
  const signature = await signer.account.signMessage({
    message,
  });

  const signatureHash = keccak256(signature);
  const secret = BigInt(signatureHash) % BN254_MODULUS;

  return secret;
}

/**
 * Generate commitment from secret
 * @param secret - Secret as bigint
 * @returns Commitment as bigint
 */
export async function generateCommitment(secret: bigint): Promise<bigint> {
  return await poseidonHash2(secret, secret);
}
