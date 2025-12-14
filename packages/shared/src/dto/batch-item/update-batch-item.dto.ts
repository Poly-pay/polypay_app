import { IsOptional, IsString, Matches } from "class-validator";

export class UpdateBatchItemDto {
  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: "Invalid Ethereum address" })
  recipient?: string;

  @IsOptional()
  @IsString()
  amount?: string;
}
