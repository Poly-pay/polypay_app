import { IsNotEmpty, IsString } from 'class-validator';

export class ApproveArcTransactionDto {
  @IsNotEmpty()
  @IsString()
  signature: string;
}
