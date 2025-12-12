import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  address?: string;
}