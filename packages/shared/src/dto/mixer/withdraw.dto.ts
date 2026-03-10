import {
  IsArray,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class MixerWithdrawDto {
  @IsNumber()
  chainId: number;

  @IsString()
  token: string;

  @IsString()
  denomination: string;

  @IsString()
  recipient: string;

  @IsString()
  nullifierHash: string;

  @IsString()
  root: string;

  @IsArray()
  @IsNumber({}, { each: true })
  proof: number[];

  @IsArray()
  @IsString({ each: true })
  publicInputs: string[];

  @IsOptional()
  @IsString()
  vk?: string;
}

// TODO: remove this DTO
export class RegisterVkDto {
  @IsString()
  vk: string;
}

export class MixerDepositsQueryDto {
  @IsNumberString()
  chainId: number;

  @IsString()
  token: string;

  @IsString()
  denomination: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fromLeaf?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  toLeaf?: number;
}
