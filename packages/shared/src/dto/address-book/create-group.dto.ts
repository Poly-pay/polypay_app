import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateContactGroupDto {
  @IsNotEmpty()
  @IsString()
  accountId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  contactIds?: string[];
}
