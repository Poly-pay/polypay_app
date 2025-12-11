import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  Min,
} from 'class-validator';

export enum TxType {
  TRANSFER = 'TRANSFER',
  ADD_SIGNER = 'ADD_SIGNER',
  REMOVE_SIGNER = 'REMOVE_SIGNER',
  SET_THRESHOLD = 'SET_THRESHOLD',
  BATCH = 'BATCH',
}

export class CreateTransactionDto {
  @IsNumber()
  @IsNotEmpty()
  nonce: number;

  @IsEnum(TxType)
  @IsNotEmpty()
  type: TxType;

  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsNumber()
  @Min(1)
  threshold: number; // current threshold of wallet

  // Transfer
  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  value?: string;

  // Add/Remove Signer
  @IsOptional()
  @IsString()
  signerCommitment?: string;

  // Set Threshold / Add Signer / Remove Signer
  @IsOptional()
  @IsNumber()
  newThreshold?: number;

  // Batch - array of batch item IDs
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  batchItemIds?: string[];

  // Creator's proof
  @IsString()
  @IsNotEmpty()
  creatorCommitment: string;

  @IsArray()
  @IsNotEmpty()
  proof: number[];

  @IsArray()
  @IsString({ each: true })
  publicInputs: string[];

  @IsString()
  @IsNotEmpty()
  nullifier: string;

  @IsOptional()
  @IsString()
  vk?: string;
}
