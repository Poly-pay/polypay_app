import { IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTransactionDto {
  @IsInt()
  txId: number;

  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  callData?: string;

  @IsInt()
  signaturesRequired: number;
}