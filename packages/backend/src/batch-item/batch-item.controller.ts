import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { BatchItemService } from './batch-item.service';
import { CreateBatchItemDto, UpdateBatchItemDto } from '@polypay/shared';

@ApiTags('batch-items')
@Controller('batch-items')
export class BatchItemController {
  constructor(private readonly batchItemService: BatchItemService) {}

  /**
   * Create batch item
   * POST /api/batch-items
   */
  @Post()
  @ApiOperation({ summary: 'Create a new batch item' })
  @ApiBody({ type: CreateBatchItemDto })
  @ApiResponse({ status: 201, description: 'Batch item created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() dto: CreateBatchItemDto) {
    return this.batchItemService.create(dto);
  }

  /**
   * Get batch items by commitment
   * GET /api/batch-items?commitment=xxx
   */
  @Get()
  @ApiOperation({ summary: 'Get batch items by commitment' })
  @ApiQuery({
    name: 'commitment',
    required: true,
    description: 'Account commitment hash',
  })
  @ApiResponse({ status: 200, description: 'List of batch items' })
  async findByCommitment(@Query('commitment') commitment: string) {
    return this.batchItemService.findByCommitment(commitment);
  }

  /**
   * Update batch item
   * PATCH /api/batch-items/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a batch item' })
  @ApiParam({ name: 'id', description: 'Batch item ID' })
  @ApiBody({ type: UpdateBatchItemDto })
  @ApiResponse({ status: 200, description: 'Batch item updated successfully' })
  @ApiResponse({ status: 404, description: 'Batch item not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateBatchItemDto) {
    return this.batchItemService.update(id, dto);
  }

  /**
   * Delete batch item
   * DELETE /api/batch-items/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a batch item' })
  @ApiParam({ name: 'id', description: 'Batch item ID' })
  @ApiResponse({ status: 200, description: 'Batch item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Batch item not found' })
  async delete(@Param('id') id: string) {
    return this.batchItemService.delete(id);
  }

  /**
   * Clear all batch items by commitment
   * DELETE /api/batch-items?commitment=xxx
   */
  @Delete()
  @ApiOperation({ summary: 'Clear all batch items by commitment' })
  @ApiQuery({
    name: 'commitment',
    required: true,
    description: 'Account commitment hash',
  })
  @ApiResponse({ status: 200, description: 'Batch items cleared successfully' })
  async clearByCommitment(@Query('commitment') commitment: string) {
    return this.batchItemService.clearByCommitment(commitment);
  }
}
