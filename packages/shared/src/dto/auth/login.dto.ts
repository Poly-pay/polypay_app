import { IsNotEmpty, IsString, IsArray, IsOptional } from "class-validator";

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  commitment: string;

  @IsNotEmpty()
  @IsArray()
  proof: number[];

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  publicInputs: string[];

  @IsOptional()
  @IsString()
  vk?: string;
}
