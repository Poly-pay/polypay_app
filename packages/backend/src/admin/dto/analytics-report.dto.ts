import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class AnalyticsReportDto {
  @ApiPropertyOptional({
    description: 'Start date (inclusive)',
    example: '2026-01-29',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (inclusive)',
    example: '2027-01-29',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Include LOGIN records',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeLogin?: boolean;

  @ApiPropertyOptional({
    description: 'Include DENY records',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeny?: boolean;

  @ApiPropertyOptional({
    description: 'Include CLAIM records',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeClaim?: boolean;

  @ApiPropertyOptional({
    description: 'Include ADD_SIGNER, REMOVE_SIGNER, UPDATE_THRESHOLD records',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeSignerOps?: boolean;
}
