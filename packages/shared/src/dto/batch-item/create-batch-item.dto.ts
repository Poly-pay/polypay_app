import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

export class CreateBatchItemDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: "Invalid Ethereum address" })
  recipient: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(78)
  amount: string;

  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: "Invalid token address" })
  tokenAddress?: string;

  @IsString()
  @IsOptional()
  @MaxLength(256)
  contactId?: string;
}
