import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class CreateProofJobDto {
  @IsInt()
  @IsNotEmpty()
  txId: number;

  @IsString()
  @IsNotEmpty()
  nullifier: string;

  @IsString()
  @IsNotEmpty()
  jobId: string;
}