import { encodePacked, keccak256, recoverMessageAddress, type Hex } from 'viem';

/**
 * Recovers the address that signed an Arc multisig transaction.
 *
 * Mirrors `MetaMultiSigWalletArc.getTransactionHash` on-chain:
 *   keccak256(abi.encodePacked(address(this), chainId, nonce, to, value, data))
 * Signers sign the resulting 32-byte hash as an EIP-191 personal message
 * (`toEthSignedMessageHash` on the contract side); viem's `recoverMessageAddress`
 * with `{ raw: txHash }` reproduces that same digest.
 */
export async function recoverArcSigner(
  wallet: string,
  chainId: number,
  nonce: number,
  to: string,
  value: bigint,
  data: string,
  signature: string,
): Promise<string> {
  const txHash = keccak256(
    encodePacked(
      ['address', 'uint256', 'uint256', 'address', 'uint256', 'bytes'],
      [
        wallet as Hex,
        BigInt(chainId),
        BigInt(nonce),
        to as Hex,
        value,
        data as Hex,
      ],
    ),
  );

  return recoverMessageAddress({
    message: { raw: txHash },
    signature: signature as Hex,
  });
}
