import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateAccountDto {
  @IsNotEmpty()
  @IsString()
  commitment: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;
}
