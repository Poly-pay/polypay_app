import { type Hex, hashMessage, recoverPublicKey } from "viem";

/**
 * Convert hex string to byte array
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Array of numbers (bytes)
 */
export function hexToByteArray(hex: string): number[] {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
  }
  return bytes;
}

/**
 * Recover public key X and Y coordinates from signature
 * @param signature - ECDSA signature
 * @param messageHash - Original message hash that was signed
 * @returns Object with pubKeyX and pubKeyY as byte arrays
 */
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
