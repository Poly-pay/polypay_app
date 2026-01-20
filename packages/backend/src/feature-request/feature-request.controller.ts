import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { FeatureRequestService } from './feature-request.service';
import { CreateFeatureRequestDto } from '@polypay/shared';

@ApiTags('feature-requests')
@Controller('feature-requests')
export class FeatureRequestController {
  constructor(private readonly featureRequestService: FeatureRequestService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new feature request' })
  @ApiBody({ type: CreateFeatureRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Feature request submitted successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() dto: CreateFeatureRequestDto) {
    return this.featureRequestService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all feature requests (internal)' })
  @ApiResponse({ status: 200, description: 'List of feature requests' })
  async findAll() {
    return this.featureRequestService.findAll();
  }
}
