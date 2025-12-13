import { IsArray, IsNotEmpty, IsNumber, IsString, Min } from "class-validator";

export class CreateWalletDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  threshold: number;

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  commitments: string[];

  @IsNotEmpty()
  @IsString()
  creatorCommitment: string;
}
