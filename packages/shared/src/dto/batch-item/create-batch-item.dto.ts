import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateBatchItemDto {
  @IsNotEmpty()
  @IsString()
  commitment: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  recipient: string;

  @IsNotEmpty()
  @IsString()
  amount: string;
}