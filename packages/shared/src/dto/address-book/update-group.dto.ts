import { IsArray, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateContactGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  contactIds?: string[];
}
