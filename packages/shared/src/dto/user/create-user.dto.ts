import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  commitment: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;
}
