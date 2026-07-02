import { IsEthereumAddress, IsNotEmpty, IsString } from 'class-validator';

export class ArcLoginDto {
  @IsNotEmpty()
  @IsEthereumAddress()
  address: string;

  @IsNotEmpty()
  @IsString()
  signature: string;
}
