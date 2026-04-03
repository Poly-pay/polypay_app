import { type Hex, keccak256 } from 'viem';
import * as fs from 'fs';
import * as path from 'path';
import {
  poseidonHash2,
  hexToByteArray,
  getPublicKeyXY,
  BN254_MODULUS,
} from '@polypay/shared';
import { TestSigner, signRawMessage } from './signer.util';

/**
 * Proof generation result for transaction
 */
export interface ProofResult {
  proof: number[];
  publicInputs: string[];
  nullifier: string;
  commitment: string;
  vk?: string;
}

/**
 * Proof generation result for authentication
 */
export interface AuthProofResult {
  proof: number[];
  publicInputs: string[];
  vk: string;
}

/**
 * Load circuit from JSON file
 */
function loadCircuit(circuitName: 'circuit' | 'auth-circuit'): {
  bytecode: string;
  abi: any;
} {
  const circuitPath = path.join(__dirname, `../circuit/${circuitName}.json`);

  if (!fs.existsSync(circuitPath)) {
    throw new Error(`Circuit file not found at: ${circuitPath}`);
  }

  const circuitData = JSON.parse(fs.readFileSync(circuitPath, 'utf-8'));
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
  txHash: Hex,
  contractVersion: number = 2,
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
  const { bytecode, abi } = loadCircuit('circuit');

  // Dynamic import Noir libraries
  const { Noir } = await import('@noir-lang/noir_js');

  // Initialize Noir
  const noir = new Noir({ bytecode, abi } as any);

  // Execute circuit
  const { witness } = await noir.execute(circuitInputs);

  // Generate proof — branch by contractVersion
  let proof: Uint8Array;
  let publicInputs: string[];
  let vk: string | undefined;

  if (contractVersion >= 2) {
    const { UltraHonkBackend } = await import('@aztec/bb.js');
    const backend = new UltraHonkBackend(bytecode);
    ({ proof, publicInputs } = await backend.generateProof(witness, { keccak: true }));
    const rawVk = await backend.getVerificationKey({ keccak: true });
    vk = '0x' + Buffer.from(rawVk).toString('hex');
  } else {
    const { UltraPlonkBackend } = await import('@aztec/bb.js');
    const backend = new UltraPlonkBackend(bytecode);
    ({ proof, publicInputs } = await backend.generateProof(witness));
    const rawVk = await backend.getVerificationKey();
    vk = Buffer.from(rawVk).toString('base64');
  }

  // 7. Format output
  const proofArray = Array.from(proof);

  return {
    proof: proofArray,
    publicInputs: publicInputs,
    nullifier: nullifier.toString(),
    commitment: commitment.toString(),
    vk,
  };
}

/**
 * Generate ZK proof for authentication
 */
export async function generateTestAuthProof(
  secret: bigint,
): Promise<AuthProofResult> {
  // 1. Compute commitment
  const commitment = await poseidonHash2(secret, secret);

  // 2. Prepare circuit inputs
  const circuitInputs = {
    secret: secret.toString(),
    commitment: commitment.toString(),
  };

  // 3. Load auth circuit and generate proof
  const { bytecode, abi } = loadCircuit('auth-circuit');

  const { Noir } = await import('@noir-lang/noir_js');
  const { UltraHonkBackend } = await import('@aztec/bb.js');

  const backend = new UltraHonkBackend(bytecode);
  const noir = new Noir({ bytecode, abi } as any);

  const { witness } = await noir.execute(circuitInputs);
  const { proof, publicInputs } = await backend.generateProof(witness, { keccak: true });
  const rawVk = await backend.getVerificationKey({ keccak: true });
  const vk = '0x' + Buffer.from(rawVk).toString('hex');

  return {
    proof: Array.from(proof),
    publicInputs: publicInputs,
    vk,
  };
}

/**
 * Generate secret from signer (local signing, no RPC)
 * @param signer - Test signer
 * @returns Secret as bigint
 */
export async function generateSecret(signer: TestSigner): Promise<bigint> {
  const message = 'noir-identity';

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
