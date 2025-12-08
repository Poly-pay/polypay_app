import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
} from 'class-validator';

export enum TxType {
  TRANSFER = 'TRANSFER',
  ADD_SIGNER = 'ADD_SIGNER',
  REMOVE_SIGNER = 'REMOVE_SIGNER',
  SET_THRESHOLD = 'SET_THRESHOLD',
}

export class CreateTransactionDto {
  @IsNumber()
  @IsNotEmpty()
  txId: number;

  @IsEnum(TxType)
  @IsNotEmpty()
  type: TxType;

  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsNumber()
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

  // Creator's proof (auto approve)
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
