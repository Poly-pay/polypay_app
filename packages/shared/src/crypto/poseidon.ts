import { BN254_MODULUS } from "./constants";

// Lazy-loaded Poseidon instance
let poseidonInstance: any = null;

/**
 * Lazy load Poseidon hash function
 * Avoids loading circomlibjs multiple times
 */
export async function getPoseidon(): Promise<any> {
  if (!poseidonInstance) {
    const { buildPoseidon } = await import("circomlibjs");
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

/**
 * Poseidon hash with 2 inputs
 * @param a - First input (bigint)
 * @param b - Second input (bigint)
 * @returns Hash result as bigint
 */
export async function poseidonHash2(a: bigint, b: bigint): Promise<bigint> {
  const poseidon = await getPoseidon();
  const safeInputs = [a % BN254_MODULUS, b % BN254_MODULUS];
  const hash = poseidon(safeInputs);
  return BigInt(poseidon.F.toString(hash));
}
