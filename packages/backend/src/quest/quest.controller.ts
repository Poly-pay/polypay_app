import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { QuestService } from './quest.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { User } from '@/generated/prisma/client';

@ApiTags('quests')
@Controller('quests')
export class QuestController {
  constructor(private readonly questService: QuestService) {}

  /**
   * Get all quests
   * GET /api/quests
   */
  @Get()
  @ApiOperation({
    summary: 'Get all quests',
    description: 'Retrieve all active quests with their point values',
  })
  @ApiResponse({ status: 200, description: 'List of quests' })
  async getQuests() {
    return this.questService.getQuests();
  }

  /**
   * Get leaderboard
   * GET /api/quests/leaderboard
   */
  @Get('leaderboard')
  @ApiOperation({
    summary: 'Get leaderboard',
    description: 'Retrieve top users ranked by total points',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of top users to return',
    example: 10,
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    description: 'Filter by time period',
    enum: ['weekly', 'all-time'],
    example: 'all-time',
  })
  @ApiQuery({
    name: 'week',
    required: false,
    description: 'Week number (1-6), only used when filter=weekly',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Leaderboard data' })
  async getLeaderboard(
    @Query('limit') limitParam?: string,
    @Query('filter') filter?: 'weekly' | 'all-time',
    @Query('week') weekParam?: string,
  ) {
    const limit = parseInt(limitParam || '25', 10) || 25;
    const week = parseInt(weekParam || '1', 10) || 1;
    return this.questService.getLeaderboard(limit, filter || 'all-time', week);
  }

  /**
   * Get current user points
   * GET /api/quests/my-points
   */
  @Get('my-points')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user points',
    description:
      'Retrieve total points and point history for the authenticated user',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    description: 'Filter by time period',
    enum: ['weekly', 'all-time'],
    example: 'all-time',
  })
  @ApiQuery({
    name: 'week',
    required: false,
    description: 'Week number (1-6), only used when filter=weekly',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'User points data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyPoints(
    @CurrentUser() user: User,
    @Query('filter') filter?: 'weekly' | 'all-time',
    @Query('week') weekParam?: string,
  ) {
    const week = parseInt(weekParam || '1', 10) || 1;
    const filterType = filter || 'all-time';

    const points = await this.questService.getUserPoints(
      user.id,
      filterType,
      week,
    );
    const rank = await this.questService.getUserRank(user.id, filterType, week);

    return {
      ...points,
      rank,
      commitment: user.commitment,
    };
  }
}
