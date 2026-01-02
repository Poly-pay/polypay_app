import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
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
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiBody({ type: CreateWalletDto })
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@CurrentUser() user: Account, @Body() dto: CreateWalletDto) {
    return this.walletService.create(dto, user.commitment);
  }

  /**
   * Get wallet by address
   * GET /api/wallets/:address
   */
  @Get(':address')
  @UseGuards(JwtAuthGuard, WalletMemberGuard)
  @ApiOperation({ summary: 'Get wallet by address' })
  @ApiParam({ name: 'address', description: 'Wallet address' })
  @ApiResponse({ status: 200, description: 'Wallet found' })
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
  @ApiOperation({ summary: 'Update wallet information' })
  @ApiParam({ name: 'address', description: 'Wallet address' })
  @ApiBody({ type: UpdateWalletDto })
  @ApiResponse({ status: 200, description: 'Wallet updated successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async update(
    @Param('address') address: string,
    @Body() dto: UpdateWalletDto,
  ) {
    return this.walletService.update(address, dto);
  }
}
