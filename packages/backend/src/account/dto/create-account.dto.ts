import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  commitment: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;
}
