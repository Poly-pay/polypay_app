import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class DenyDto {
  @IsString()
  @IsNotEmpty()
  voterCommitment: string;

  @IsNumber()
  @IsNotEmpty()
  totalSigners: number;
}
