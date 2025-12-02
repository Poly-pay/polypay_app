import { poseidon2HashAsync } from "@zkpassport/poseidon2";
import { type Hex, type WalletClient, hashMessage, keccak256, recoverPublicKey, toBytes } from "viem";

export const MERKLE_DEPTH = 4;
export const MAX_SIGNERS = 16;
const BN254_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// ============ Types ============
export interface Signer {
  secret: bigint;
  commitment: bigint;
  signature: Hex;
}

export interface MerkleTree {
  leaves: bigint[];
  tree: bigint[][];
  root: bigint;
}

export interface ProofInput {
  signature: number[];
  pub_key_x: number[];
  pub_key_y: number[];
  secret: string;
  leaf_index: string;
  merkle_path: string[];
  tx_hash_bytes: number[];
  tx_hash_commitment: string;
  merkle_root: string;
  nullifier: string;
}

// ============ Helper Functions ============
export function hexToByteArray(hex: string): number[] {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
  }
  return bytes;
}

export async function createSecret(walletClient: WalletClient): Promise<bigint> {
  const [account] = await walletClient.getAddresses();

  // Sign fixed message to derive secret
  const message = "noir-identity";
  const signature = await walletClient.signMessage({
    account,
    message,
  });

  // secret = keccak256(signature)
  const signatureHash = keccak256(signature);
  const secret = BigInt(signatureHash) % BN254_MODULUS;

  return secret;
}

export async function buildMerkleTree(commitments: readonly bigint[]): Promise<MerkleTree> {
  const leaves = [...commitments];
  while (leaves.length < MAX_SIGNERS) {
    leaves.push(BigInt(0));
  }

  const tree: bigint[][] = [leaves];
  let currentLevel = leaves;

  while (currentLevel.length > 1) {
    const nextLevel: bigint[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1];
      const parent = await poseidon2HashAutoPadding3([left, right]);
      nextLevel.push(parent);
    }
    tree.push(nextLevel);
    currentLevel = nextLevel;
  }

  return {
    leaves,
    tree,
    root: tree[tree.length - 1][0],
  };
}

export function getMerklePath(merkleTree: MerkleTree, leafIndex: number): bigint[] {
  const path: bigint[] = [];
  let index = leafIndex;

  for (let level = 0; level < MERKLE_DEPTH; level++) {
    const isRight = index % 2 === 1;
    const siblingIndex = isRight ? index - 1 : index + 1;
    path.push(merkleTree.tree[level][siblingIndex]);
    index = Math.floor(index / 2);
  }

  return path;
}

export async function computeMerkleRoot(leaf: bigint, leafIndex: bigint, merklePath: bigint[]) {
  let current = leaf;
  let index = leafIndex;

  for (let i = 0; i < merklePath.length; i++) {
    const sibling = merklePath[i];
    if (index % 2n === 0n) {
      // Current ở bên trái
      current = await poseidon2HashAutoPadding3([current, sibling]);
    } else {
      // Current ở bên phải
      current = await poseidon2HashAutoPadding3([sibling, current]);
    }
    index = index / 2n;
  }

  return current;
}

export async function poseidon2HashAutoPadding3(inputs: bigint[]): Promise<bigint> {
  if (inputs.length > 3) {
    throw new Error("Poseidon2 supports max 3 inputs");
  }

  const padded: bigint[] = [...inputs];
  while (padded.length < 3) {
    padded.push(0n);
  }

  return await poseidon2HashAsync(padded);
}

export async function getPublicKeyXY(
  signature: Hex,
  messageHash: Hex,
): Promise<{ pubKeyX: number[]; pubKeyY: number[] }> {
  const prefixedHash = hashMessage({ raw: messageHash });

  const publicKey = await recoverPublicKey({
    hash: prefixedHash,
    signature: signature,
  });

  // publicKey format: 0x04 + x(64 hex) + y(64 hex)
  const pubKeyX = hexToByteArray("0x" + publicKey.slice(4, 68));
  const pubKeyY = hexToByteArray("0x" + publicKey.slice(68, 132));

  return { pubKeyX, pubKeyY };
}

export async function createCommitment(secret: bigint): Promise<bigint> {
  return await poseidon2HashAutoPadding3([secret, secret]);
}
