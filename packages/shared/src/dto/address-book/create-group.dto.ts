import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateAddressGroupDto {
  @IsNotEmpty()
  @IsString()
  walletId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;
}
