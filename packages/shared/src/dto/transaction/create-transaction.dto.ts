import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TxType } from '../../enums';

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsEnum(TxType)
  type: TxType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  nonce: number;

  @IsNotEmpty()
  @IsString()
  walletAddress: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  threshold: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  totalSigners: number;

  @IsNotEmpty()
  @IsString()
  creatorCommitment: string;

  // TRANSFER
  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  value?: string;

  // ADD_SIGNER / REMOVE_SIGNER
  @IsOptional()
  @IsString()
  signerCommitment?: string;

  // SET_THRESHOLD / ADD_SIGNER / REMOVE_SIGNER
  @IsOptional()
  @IsNumber()
  @Min(1)
  newThreshold?: number;

  // BATCH
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  batchItemIds?: string[];

  // Proof data
  @IsNotEmpty()
  @IsArray()
  proof: number[];

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  publicInputs: string[];

  @IsNotEmpty()
  @IsString()
  nullifier: string;

  @IsOptional()
  @IsString()
  vk?: string;
}