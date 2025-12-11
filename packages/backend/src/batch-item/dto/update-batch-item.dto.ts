import { IsString, IsOptional } from 'class-validator';

export class UpdateBatchItemDto {
  @IsString()
  @IsOptional()
  recipient?: string;

  @IsString()
  @IsOptional()
  amount?: string;
}
