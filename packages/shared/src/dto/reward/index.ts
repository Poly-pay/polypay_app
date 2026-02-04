import { IsNotEmpty, IsString } from "class-validator";

export class ClaimRequest {
  @IsNotEmpty()
  @IsString()
  toAddress: string;
}
