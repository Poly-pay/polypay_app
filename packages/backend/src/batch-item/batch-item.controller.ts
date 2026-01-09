import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BatchItemService } from './batch-item.service';
import { CreateBatchItemDto, UpdateBatchItemDto } from '@polypay/shared';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { BatchItemOwnerGuard } from '@/auth/guards/batch-item-owner.guard';
import { User } from '@/generated/prisma/client';

@ApiTags('batch-items')
@ApiBearerAuth('JWT-auth')
@Controller('batch-items')
export class BatchItemController {
  constructor(private readonly batchItemService: BatchItemService) {}

  /**
   * Create batch item
   * POST /api/batch-items
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new batch item' })
  @ApiBody({ type: CreateBatchItemDto })
  @ApiResponse({ status: 201, description: 'Batch item created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@CurrentUser() user: User, @Body() dto: CreateBatchItemDto) {
    return this.batchItemService.create(dto, user.commitment);
  }

  /**
   * Get my batch items
   * GET /api/batch-items/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my batch items' })
  @ApiResponse({ status: 200, description: 'List of batch items' })
  async getMyBatchItems(@CurrentUser() user: User) {
    return this.batchItemService.findByCommitment(user.commitment);
  }

  /**
   * Update batch item
   * PATCH /api/batch-items/:id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, BatchItemOwnerGuard)
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
  @UseGuards(JwtAuthGuard, BatchItemOwnerGuard)
  @ApiOperation({ summary: 'Delete a batch item' })
  @ApiParam({ name: 'id', description: 'Batch item ID' })
  @ApiResponse({ status: 200, description: 'Batch item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Batch item not found' })
  async delete(@Param('id') id: string) {
    return this.batchItemService.delete(id);
  }

  /**
   * Clear all my batch items
   * DELETE /api/batch-items/me
   */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Clear all my batch items' })
  @ApiResponse({ status: 200, description: 'Batch items cleared successfully' })
  async clearMyBatchItems(@CurrentUser() user: User) {
    return this.batchItemService.clearByCommitment(user.commitment);
  }
}
