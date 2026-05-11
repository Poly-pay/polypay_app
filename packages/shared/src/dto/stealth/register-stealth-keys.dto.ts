import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Min,
  Max,
} from "class-validator";

// secp256k1 compressed public key prefix: 0x02 or 0x03 (y-parity).
const PUBKEY_PREFIX_VALUES = [2, 3] as const;

const HEX_32_BYTES = /^0x[a-fA-F0-9]{64}$/;
const HEX_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const HEX_ANY = /^0x[a-fA-F0-9]+$/;

export class RegisterStealthKeysDto {
  @IsNotEmpty()
  @IsString()
  @Matches(HEX_ADDRESS, {
    message: "walletAddress must be a 0x-prefixed address",
  })
  walletAddress: string;

  @IsInt()
  @Min(PUBKEY_PREFIX_VALUES[0])
  @Max(PUBKEY_PREFIX_VALUES[1])
  spendingPubKeyPrefix: number;

  @IsString()
  @Matches(HEX_32_BYTES, { message: "spendingPubKey must be 32 bytes hex" })
  spendingPubKey: string;

  @IsInt()
  @Min(PUBKEY_PREFIX_VALUES[0])
  @Max(PUBKEY_PREFIX_VALUES[1])
  viewingPubKeyPrefix: number;

  @IsString()
  @Matches(HEX_32_BYTES, { message: "viewingPubKey must be 32 bytes hex" })
  viewingPubKey: string;

  // EIP-712 signature authorizing PolyPay's relayer to call
  // StealthKeyRegistry.setStealthKeysOnBehalf for this walletAddress.
  @IsString()
  @Matches(HEX_ANY, { message: "signature must be hex-encoded" })
  signature: string;
}

export interface StealthRegistrationStatusResponse {
  walletAddress: string;
  registered: boolean;
  spendingPubKeyPrefix?: number;
  spendingPubKey?: string;
  viewingPubKeyPrefix?: number;
  viewingPubKey?: string;
}

export interface RegisterStealthKeysResponse {
  txHash: string;
  registryAddress: string;
  chainId: number;
}
