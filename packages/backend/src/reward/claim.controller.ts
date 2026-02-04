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
   * Claim reward for a specific week
   * POST /api/claims
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Claim reward for a specific week',
    description: 'Claim reward for a specific week and receive ZEN tokens',
  })
  @ApiResponse({ status: 200, description: 'Claim successful' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - no reward, already claimed, or invalid address',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Transfer failed' })
  async claimRewards(
    @CurrentUser() user: User,
    @Body() claimRequest: ClaimRequest,
  ): Promise<ClaimResponse> {
    const { toAddress, week } = claimRequest;

    // Validate address
    if (!isAddress(toAddress)) {
      throw new BadRequestException(`Invalid recipient address: ${toAddress}`);
    }

    // Get claim summary
    const summary = await this.rewardService.getClaimSummary(user.commitment);

    // Find the specific week
    const weekData = summary.weeks.find((w) => w.week === week);

    if (!weekData) {
      throw new BadRequestException(`No reward found for week ${week}`);
    }

    if (weekData.isClaimed) {
      throw new BadRequestException(`Week ${week} already claimed`);
    }

    if (weekData.rewardZen <= 0) {
      throw new BadRequestException(`No reward amount for week ${week}`);
    }

    this.logger.log(
      `User ${user.commitment} claiming ${weekData.rewardZen} ZEN for week ${week}`,
    );

    // Send ZEN
    let txHash: string;
    try {
      txHash = await this.zenTransferService.sendZen(
        toAddress,
        weekData.rewardZen,
      );
    } catch (error: any) {
      this.logger.error(`ZEN transfer failed: ${error.message}`);
      throw new InternalServerErrorException(
        `Failed to send ZEN: ${error.message}`,
      );
    }

    // Create ClaimHistory record
    try {
      await this.prisma.claimHistory.create({
        data: {
          userId: user.id,
          week: weekData.week,
          rank: weekData.rank,
          rewardUsd: weekData.rewardUsd,
          rewardZen: weekData.rewardZen,
          toAddress: toAddress,
          txHash: txHash,
        },
      });
    } catch (error: any) {
      // Log but don't fail - ZEN already sent
      this.logger.error(
        `Failed to create ClaimHistory for week ${week}: ${error.message}`,
      );
    }

    this.logger.log(
      `Claim successful. TxHash: ${txHash}, Week: ${week}, ZEN: ${weekData.rewardZen}`,
    );

    return {
      success: true,
      txHash,
      rewardZen: weekData.rewardZen,
      weekClaimed: week,
    };
  }
}
