import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;
}
