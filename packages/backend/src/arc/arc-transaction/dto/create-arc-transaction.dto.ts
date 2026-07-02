import {
  IsEthereumAddress,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsString,
} from 'class-validator';

// USDC is native on Arc, so a transfer is a plain native-value call
// (to = recipient, value = amount, data = "0x"), not an ERC20 call.
// `data` is only validated (not persisted) since Arc currently supports
// native transfers exclusively - Transaction has no generic calldata column.
export class CreateArcTransactionDto {
  @IsNotEmpty()
  @IsString()
  accountId: string;

  @IsNotEmpty()
  @IsEthereumAddress()
  to: string;

  @IsNotEmpty()
  @IsNumberString()
  value: string;

  @IsNotEmpty()
  @IsIn(['0x'])
  data: string;

  @IsNotEmpty()
  @IsString()
  signature: string;
}
