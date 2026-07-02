import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEthereumAddress,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateArcAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsEthereumAddress({ each: true })
  owners: string[];

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  threshold: number;

  @IsNotEmpty()
  @IsNumber()
  chainId: number;
}
