import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DepositRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  memo?: string;
}
