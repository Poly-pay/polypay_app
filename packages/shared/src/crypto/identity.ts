import { type WalletClient, keccak256 } from "viem";
import { BN254_MODULUS } from "./constants";
import { poseidonHash2 } from "./poseidon";

/**
 * Create secret from wallet signature
 * Signs fixed message "noir-identity" and hashes the signature
 * @param walletClient - Viem wallet client
 * @returns Secret as bigint
 */
export async function createSecret(
  walletClient: WalletClient,
): Promise<bigint> {
  const [account] = await walletClient.getAddresses();

  // Sign fixed message to derive secret
  const message = "noir-identity";
  const signature = await walletClient.signMessage({
    account,
    message,
  });

  // secret = keccak256(signature) mod BN254_MODULUS
  const signatureHash = keccak256(signature);
  const secret = BigInt(signatureHash) % BN254_MODULUS;

  return secret;
}

/**
 * Create commitment from secret
 * commitment = poseidonHash2(secret, secret)
 * @param secret - Secret as bigint
 * @returns Commitment as bigint
 */
export async function createCommitment(secret: bigint): Promise<bigint> {
  return await poseidonHash2(secret, secret);
}
