import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export class CreateBatchItemDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: "Invalid Ethereum address" })
  recipient: string;

  @IsNotEmpty()
  @IsString()
  amount: string;

  @IsOptional()
  @IsString()
  tokenAddress?: string;

  @IsString()
  @IsOptional()
  contactId?: string;
}
