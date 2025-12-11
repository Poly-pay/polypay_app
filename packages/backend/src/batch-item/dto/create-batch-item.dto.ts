import { IsString, IsNotEmpty } from 'class-validator';

export class CreateBatchItemDto {
  @IsString()
  @IsNotEmpty()
  commitment: string;

  @IsString()
  @IsNotEmpty()
  recipient: string;

  @IsString()
  @IsNotEmpty()
  amount: string;
}