import { IsNotEmpty, IsString, IsArray, IsOptional } from "class-validator";

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  commitment: string;

  @IsNotEmpty()
  @IsArray()
  proof: number[];

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  publicInputs: string[];

  @IsOptional()
  @IsString()
  vk?: string;

  @IsOptional()
  @IsString()
  walletAddress?: string; // For analytics only - NOT stored in database
}
