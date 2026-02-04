import { IsNotEmpty, IsString, IsNumber, Min, Max } from "class-validator";

export class ClaimRequest {
  @IsNotEmpty()
  @IsString()
  toAddress: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(6)
  week: number;
}
