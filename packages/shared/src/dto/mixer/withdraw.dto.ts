import { IsArray, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

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
  @IsNumber()
  chainId: number;

  @IsString()
  token: string;

  @IsString()
  denomination: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fromLeaf?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  toLeaf?: number;
}

