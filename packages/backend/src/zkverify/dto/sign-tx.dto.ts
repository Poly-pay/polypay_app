import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';

/**
 * DTO for signing an existing transaction
 * Flow: Submit additional proof for existing txId
 */
export class SignTxDto {
  @IsNumber()
  @IsNotEmpty()
  txId: number; // Existing transaction ID

  @IsArray()
  @IsNotEmpty()
  proof: number[];

  @IsArray()
  @IsString({ each: true })
  publicInputs: string[];

  @IsString()
  @IsNotEmpty()
  nullifier: string;

  @IsOptional()
  @IsString()
  vk?: string;
}
