import { IsOptional, IsString } from "class-validator";

export class UpdateWalletDto {
  @IsOptional()
  @IsString()
  name?: string;
}
