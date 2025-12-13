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
import { BatchItemService } from './batch-item.service';
import { CreateBatchItemDto, UpdateBatchItemDto } from '@polypay/shared';

@Controller('batch-items')
export class BatchItemController {
  constructor(private readonly batchItemService: BatchItemService) {}

  /**
   * Create batch item
   * POST /api/batch-items
   */
  @Post()
  async create(@Body() dto: CreateBatchItemDto) {
    return this.batchItemService.create(dto);
  }

  /**
   * Get batch items by commitment
   * GET /api/batch-items?commitment=xxx
   */
  @Get()
  async findByCommitment(@Query('commitment') commitment: string) {
    return this.batchItemService.findByCommitment(commitment);
  }

  /**
   * Update batch item
   * PATCH /api/batch-items/:id
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBatchItemDto) {
    return this.batchItemService.update(id, dto);
  }

  /**
   * Delete batch item
   * DELETE /api/batch-items/:id
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.batchItemService.delete(id);
  }

  /**
   * Clear all batch items by commitment
   * DELETE /api/batch-items?commitment=xxx
   */
  @Delete()
  async clearByCommitment(@Query('commitment') commitment: string) {
    return this.batchItemService.clearByCommitment(commitment);
  }
}
