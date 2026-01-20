import { IsOptional, IsString } from "class-validator";

export class DenyTransactionDto {
  @IsOptional()
  @IsString()
  userAddress?: string;
}
