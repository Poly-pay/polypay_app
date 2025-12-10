import { IsString, IsNotEmpty } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  commitment: string;
}
