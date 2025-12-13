import { IsArray, IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Base DTO for submitting proof to zkVerify (internal use)
 */
export class SubmitProofDto {
  @IsArray()
  @IsNotEmpty()
  proof: number[];

  @IsArray()
  @IsString({ each: true })
  publicInputs: string[];

  @IsOptional()
  @IsString()
  vk?: string;
}
