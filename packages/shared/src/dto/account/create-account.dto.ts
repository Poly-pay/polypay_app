import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { SignerData } from "../../types/index";

export class CreateAccountDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  threshold: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  signers: SignerData[];

  @IsNotEmpty()
  @IsNumber()
  chainId: number;

  @IsOptional()
  @IsString()
  @MaxLength(42)
  userAddress?: string;
}

export class CreateAccountBatchDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  threshold: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  signers: SignerData[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  chainIds: number[];

  @IsOptional()
  @IsString()
  @MaxLength(42)
  userAddress?: string;
}
