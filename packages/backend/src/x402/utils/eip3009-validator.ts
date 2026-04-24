import { recoverTypedDataAddress, serializeSignature } from 'viem';
import type { Eip3009Authorization } from '@polypay/shared';
import type { Eip712Domain } from '../eip712-domain-cache.service';

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

export async function recoverEip3009Signer(
  auth: Eip3009Authorization,
  domain: Eip712Domain,
): Promise<string> {
  const signature = serializeSignature({
    r: auth.r as `0x${string}`,
    s: auth.s as `0x${string}`,
    v: BigInt(auth.v),
  });

  return recoverTypedDataAddress({
    domain: {
      name: domain.name,
      version: domain.version,
      chainId: domain.chainId,
      verifyingContract: domain.verifyingContract,
    },
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: 'TransferWithAuthorization',
    message: {
      from: auth.from as `0x${string}`,
      to: auth.to as `0x${string}`,
      value: BigInt(auth.value),
      validAfter: BigInt(auth.validAfter),
      validBefore: BigInt(auth.validBefore),
      nonce: auth.nonce as `0x${string}`,
    },
    signature,
  });
}
