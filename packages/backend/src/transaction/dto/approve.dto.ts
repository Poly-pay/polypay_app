import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class ApproveDto {
  @IsString()
  @IsNotEmpty()
  voterCommitment: string;

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