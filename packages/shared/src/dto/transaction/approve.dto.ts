import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class ApproveTransactionDto {
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
