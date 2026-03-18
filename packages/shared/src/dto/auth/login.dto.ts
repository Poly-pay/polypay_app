import {
  ArrayMaxSize,
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  MaxLength,
} from "class-validator";

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(256)
  commitment: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayMaxSize(65536)
  proof: number[];

  @IsNotEmpty()
  @IsArray()
  @ArrayMaxSize(256)
  @IsString({ each: true })
  publicInputs: string[];

  @IsOptional()
  @IsString()
  @MaxLength(65536)
  vk?: string;

  @IsOptional()
  @IsString()
  @MaxLength(42)
  walletAddress?: string; // For analytics only - NOT stored in database
}
