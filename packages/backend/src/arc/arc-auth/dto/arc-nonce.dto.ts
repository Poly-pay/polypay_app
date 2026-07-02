import { IsEthereumAddress, IsNotEmpty } from 'class-validator';

export class ArcNonceDto {
  @IsNotEmpty()
  @IsEthereumAddress()
  address: string;
}
