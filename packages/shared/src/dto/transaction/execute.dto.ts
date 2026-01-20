import { IsOptional, IsString } from "class-validator";

export class ExecuteTransactionDto {
  @IsOptional()
  @IsString()
  userAddress?: string;
}
