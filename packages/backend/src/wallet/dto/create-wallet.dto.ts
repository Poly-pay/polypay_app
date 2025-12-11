import { IsString, IsNotEmpty, IsNumber, IsArray, Min } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(1)
  threshold: number;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  commitments: string[];

  @IsString()
  @IsNotEmpty()
  creatorCommitment: string;
}
