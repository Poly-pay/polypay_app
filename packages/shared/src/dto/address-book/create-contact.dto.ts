import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
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
  @ArrayMinSize(1, { message: "Contact must belong to at least one group" })
  @IsString({ each: true })
  groupIds: string[];
}
