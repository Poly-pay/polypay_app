import { IsBoolean, IsOptional, IsString, Matches } from "class-validator";

export class UpdateBatchItemDto {
  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: "Invalid Ethereum address" })
  recipient?: string;

  @IsOptional()
  @IsString()
  amount?: string;

  @IsOptional()
  @IsString()
  tokenAddress?: string;

  @IsString()
  @IsOptional()
  contactId?: string;

  @IsOptional()
  @IsBoolean()
  sendPrivately?: boolean;
}
