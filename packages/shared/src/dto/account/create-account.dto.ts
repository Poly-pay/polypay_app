import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from "class-validator";

export interface Signer {
  commitment: string;
  name?: string;
}

export class CreateAccountDto {
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
