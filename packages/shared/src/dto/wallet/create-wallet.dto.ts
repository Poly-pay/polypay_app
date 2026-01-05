import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export interface Signer {
  commitment: string;
  name?: string;
}

export class CreateWalletDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  threshold: number;

  @IsArray()
  @ArrayMinSize(1)
  signers: Signer[];
}
