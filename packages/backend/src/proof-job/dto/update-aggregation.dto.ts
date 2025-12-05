import { IsString, IsInt, IsArray, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateAggregationDto {
  @IsString()
  @IsNotEmpty()
  aggregationId: string;

  @IsArray()
  @IsString({ each: true })
  merkleProof: string[];

  @IsInt()
  leafCount: number;

  @IsInt()
  leafIndex: number;

  @IsInt()
  @IsOptional()
  domainId?: number;
}