import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { TxType } from "../../enums";
import { SignerData } from "../../types";

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
  accountAddress: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  threshold: number;

  // TRANSFER
  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsString()
  tokenAddress?: string;

  // Link to contact (optional)
  @IsOptional()
  @IsString()
  contactId?: string;

  // ADD_SIGNER / REMOVE_SIGNER
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: "At least 1 signer is required" })
  @ArrayMaxSize(10, { message: "Maximum 10 signers per transaction" })
  signers?: SignerData[];

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
