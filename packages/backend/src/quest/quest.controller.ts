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
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@polypay/shared';

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
   * Get top 3 leaderboard entries
   * GET /api/quests/leaderboard/top
   * Note: Must be defined BEFORE /leaderboard to avoid route conflict
   */
  @Get('leaderboard/top')
  @ApiOperation({
    summary: 'Get top 3 leaderboard entries',
    description: 'Retrieve top 3 users for podium display',
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
  @ApiResponse({ status: 200, description: 'Top 3 leaderboard entries' })
  async getLeaderboardTop(
    @Query('filter') filter?: 'weekly' | 'all-time',
    @Query('week') weekParam?: string,
  ) {
    const week = parseInt(weekParam || '1', 10) || 1;
    return this.questService.getLeaderboardTop(filter || 'all-time', week);
  }

  /**
   * Get current user's leaderboard position
   * GET /api/quests/leaderboard/me
   */
  @Get('leaderboard/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user leaderboard position',
    description: 'Retrieve rank and points for the authenticated user',
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
  @ApiResponse({ status: 200, description: 'Current user rank and points' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLeaderboardMe(
    @CurrentUser() user: User,
    @Query('filter') filter?: 'weekly' | 'all-time',
    @Query('week') weekParam?: string,
  ) {
    const week = parseInt(weekParam || '1', 10) || 1;
    return this.questService.getLeaderboardMe(
      user.id,
      user.commitment,
      filter || 'all-time',
      week,
    );
  }

  /**
   * Get paginated leaderboard
   * GET /api/quests/leaderboard
   */
  @Get('leaderboard')
  @ApiOperation({
    summary: 'Get paginated leaderboard',
    description: 'Retrieve users ranked by total points with cursor pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor for pagination (rank number)',
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
  @ApiResponse({ status: 200, description: 'Paginated leaderboard data' })
  async getLeaderboard(
    @Query('limit') limitParam?: string,
    @Query('cursor') cursor?: string,
    @Query('filter') filter?: 'weekly' | 'all-time',
    @Query('week') weekParam?: string,
  ) {
    const limit = Math.min(
      parseInt(limitParam || String(DEFAULT_PAGE_SIZE), 10) ||
        DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const week = parseInt(weekParam || '1', 10) || 1;
    return this.questService.getLeaderboard(
      limit,
      filter || 'all-time',
      week,
      cursor,
    );
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
