import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: "Invalid Ethereum address" })
  address: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  groupIds?: string[];
}
