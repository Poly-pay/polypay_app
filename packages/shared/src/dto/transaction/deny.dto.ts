import { IsNotEmpty, IsNumber, Min } from "class-validator";

export class DenyTransactionDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  totalSigners: number;
}
