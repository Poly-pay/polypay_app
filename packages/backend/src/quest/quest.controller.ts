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
  @ApiResponse({ status: 200, description: 'Leaderboard data' })
  async getLeaderboard(@Query('limit') limitParam?: string) {
    const limit = parseInt(limitParam || '10', 10) || 10;
    return this.questService.getLeaderboard(limit);
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
  @ApiResponse({ status: 200, description: 'User points data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyPoints(@CurrentUser() user: User) {
    const points = await this.questService.getUserPoints(user.id);
    const rank = await this.questService.getUserRank(user.id);

    return {
      ...points,
      rank,
    };
  }
}
