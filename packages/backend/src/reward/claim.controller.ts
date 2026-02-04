import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { User } from '@/generated/prisma/client';
import { RewardService } from './reward.service';
import { ZenTransferService } from './zen-transfer.service';
import { PrismaService } from '@/database/prisma.service';
import { ClaimRequest, ClaimResponse, ClaimSummary } from '@polypay/shared';
import { isAddress } from 'viem';

@ApiTags('claims')
@Controller('claims')
export class ClaimController {
  private readonly logger = new Logger(ClaimController.name);

  constructor(
    private readonly rewardService: RewardService,
    private readonly zenTransferService: ZenTransferService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get claim summary for current user
   * GET /api/claims/summary
   */
  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get claim summary',
    description: 'Get claimable weeks and total rewards for the current user',
  })
  @ApiResponse({ status: 200, description: 'Claim summary' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getClaimSummary(@CurrentUser() user: User): Promise<ClaimSummary> {
    return this.rewardService.getClaimSummary(user.commitment);
  }

  /**
   * Claim all unclaimed rewards
   * POST /api/claims
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Claim rewards',
    description: 'Claim all unclaimed rewards and receive ZEN tokens',
  })
  @ApiResponse({ status: 200, description: 'Claim successful' })
  @ApiResponse({ status: 400, description: 'Bad request - no rewards or invalid address' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Transfer failed' })
  async claimRewards(
    @CurrentUser() user: User,
    @Body() claimRequest: ClaimRequest,
  ): Promise<ClaimResponse> {
    const { toAddress } = claimRequest;

    // Validate address
    if (!isAddress(toAddress)) {
      throw new BadRequestException(`Invalid recipient address: ${toAddress}`);
    }

    // Get claim summary
    const summary = await this.rewardService.getClaimSummary(user.commitment);

    // Get unclaimed weeks
    const unclaimedWeeks = summary.weeks.filter((w) => !w.isClaimed);

    if (unclaimedWeeks.length === 0) {
      throw new BadRequestException('No rewards to claim');
    }

    if (summary.totalZen <= 0) {
      throw new BadRequestException('Total reward amount is zero');
    }

    this.logger.log(
      `User ${user.commitment} claiming ${summary.totalZen} ZEN for weeks: ${unclaimedWeeks.map((w) => w.week).join(', ')}`,
    );

    // Send ZEN
    let txHash: string;
    try {
      txHash = await this.zenTransferService.sendZen(toAddress, summary.totalZen);
    } catch (error: any) {
      this.logger.error(`ZEN transfer failed: ${error.message}`);
      throw new InternalServerErrorException(
        `Failed to send ZEN: ${error.message}`,
      );
    }

    // Create ClaimHistory records for each week
    const weeksClaimed: number[] = [];

    for (const week of unclaimedWeeks) {
      try {
        await this.prisma.claimHistory.create({
          data: {
            userId: user.id,
            week: week.week,
            rank: week.rank,
            rewardUsd: week.rewardUsd,
            rewardZen: week.rewardZen,
            toAddress: toAddress,
            txHash: txHash,
          },
        });
        weeksClaimed.push(week.week);
      } catch (error: any) {
        // Log but don't fail - ZEN already sent
        this.logger.error(
          `Failed to create ClaimHistory for week ${week.week}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Claim successful. TxHash: ${txHash}, Weeks: ${weeksClaimed.join(', ')}, Total ZEN: ${summary.totalZen}`,
    );

    return {
      success: true,
      txHash,
      totalZen: summary.totalZen,
      weeksClaimed,
    };
  }
}
