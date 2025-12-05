import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
} from 'class-validator';

/**
 * DTO for proposing a new transaction with first proof
 * Flow: Create transaction + Submit first proof to zkVerify
 */
export class ProposeTxAndSubmitProofDto {
  // Transaction data
  @IsNumber()
  @IsNotEmpty()
  txId: number; // Transaction ID

  @IsString()
  @IsNotEmpty()
  to: string; // Target address

  @IsString()
  @IsNotEmpty()
  value: string; // Amount in wei (string for bigint)

  @IsString()
  @IsOptional()
  callData?: string; // Optional call data

  @IsNumber()
  signaturesRequired: number; // Required signatures to execute

  // Proof data
  @IsArray()
  @IsNotEmpty()
  proof: number[]; // ZK proof as number array

  @IsArray()
  @IsString({ each: true })
  publicInputs: string[]; // Public inputs for verification

  @IsString()
  @IsNotEmpty()
  nullifier: string; // Unique nullifier to prevent double-signing

  @IsOptional()
  @IsString()
  vk?: string; // Optional verification key
}
