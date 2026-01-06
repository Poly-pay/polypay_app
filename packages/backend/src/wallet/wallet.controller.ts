import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto, UpdateWalletDto } from '@polypay/shared';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { WalletMemberGuard } from '@/auth/guards/wallet-member.guard';
import { Account } from '@/generated/prisma/client';

@ApiTags('wallets')
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Create new wallet
   * POST /api/wallets
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new multi-signature wallet',
    description:
      'Deploy a new multi-signature wallet on-chain. The creator is automatically added as a member.',
  })
  @ApiBody({
    type: CreateWalletDto,
    examples: {
      example1: {
        summary: '2-of-3 multisig wallet',
        value: {
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
          threshold: 2,
          name: 'Team Treasury',
          memberCommitments: [
            '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
            '0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab',
            '0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
          ],
        },
      },
      example2: {
        summary: '1-of-1 personal wallet',
        value: {
          address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
          threshold: 1,
          name: 'My Personal Wallet',
          memberCommitments: [
            '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async create(@CurrentUser() user: Account, @Body() dto: CreateWalletDto) {
    return this.walletService.create(dto, user.commitment);
  }

  /**
   * Get wallet by address
   * GET /api/wallets/:address
   */
  @Get(':address')
  @UseGuards(JwtAuthGuard, WalletMemberGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get wallet details by address',
    description:
      'Retrieve detailed information about a wallet including members, threshold, and transaction history. Only wallet members can access this.',
  })
  @ApiParam({
    name: 'address',
    description: 'Wallet contract address (0x...)',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @ApiResponse({ status: 200, description: 'Wallet found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not a wallet member',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async findByAddress(@Param('address') address: string) {
    return this.walletService.findByAddress(address);
  }

  /**
   * Update wallet by address
   * PATCH /api/wallets/:address
   */
  @Patch(':address')
  @UseGuards(JwtAuthGuard, WalletMemberGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update wallet information',
    description:
      'Update wallet metadata such as name or description. Only wallet members can update.',
  })
  @ApiParam({
    name: 'address',
    description: 'Wallet contract address (0x...)',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @ApiBody({
    type: UpdateWalletDto,
    examples: {
      example1: {
        summary: 'Update wallet name',
        value: {
          name: 'Updated Team Treasury',
        },
      },
      example2: {
        summary: 'Update wallet metadata',
        value: {
          name: 'Marketing Budget Wallet',
          metadata: {
            description: 'Wallet for marketing expenses',
            category: 'operational',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Wallet updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not a wallet member',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async update(
    @Param('address') address: string,
    @Body() dto: UpdateWalletDto,
  ) {
    return this.walletService.update(address, dto);
  }
}
