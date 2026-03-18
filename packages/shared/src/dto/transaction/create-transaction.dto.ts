import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from "class-validator";
import { TxType } from "../../enums/index";
import { SignerData } from "../../types/index";

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

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
  @Matches(ETH_ADDRESS_REGEX, { message: "Invalid account address" })
  accountAddress: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  threshold: number;

  // TRANSFER
  @IsOptional()
  @IsString()
  @Matches(ETH_ADDRESS_REGEX, { message: "Invalid recipient address" })
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(78)
  value?: string;

  @IsOptional()
  @IsString()
  @Matches(ETH_ADDRESS_REGEX, { message: "Invalid token address" })
  tokenAddress?: string;

  // Link to contact (optional)
  @IsOptional()
  @IsString()
  @MaxLength(256)
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
  @ArrayMaxSize(50)
  @IsString({ each: true })
  batchItemIds?: string[];

  // Proof data
  @IsNotEmpty()
  @IsArray()
  @ArrayMaxSize(65536)
  proof: number[];

  @IsNotEmpty()
  @IsArray()
  @ArrayMaxSize(256)
  @IsString({ each: true })
  publicInputs: string[];

  @IsNotEmpty()
  @IsString()
  @MaxLength(256)
  nullifier: string;

  @IsOptional()
  @IsString()
  @MaxLength(65536)
  vk?: string;

  @IsOptional()
  @IsString()
  @MaxLength(42)
  userAddress?: string;
}
