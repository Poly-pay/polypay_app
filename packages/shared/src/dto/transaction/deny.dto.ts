import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class DenyTransactionDto {
  @IsNotEmpty()
  @IsString()
  voterCommitment: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  totalSigners: number;
}