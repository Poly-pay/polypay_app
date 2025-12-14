import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ApproveTransactionDto {
  @IsNotEmpty()
  @IsString()
  voterCommitment: string;

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
