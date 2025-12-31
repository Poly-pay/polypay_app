import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto, UpdateWalletDto } from '@polypay/shared';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@ApiTags('wallets')
@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Create new wallet
   * POST /api/wallets
   */
  @Post()
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiBody({ type: CreateWalletDto })
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() dto: CreateWalletDto) {
    return this.walletService.create(dto);
  }

  /**
   * Get wallet by address
   * GET /api/wallets/:address
   */
  @Get(':address')
  @ApiOperation({ summary: 'Get wallet by address' })
  @ApiParam({ name: 'address', description: 'Wallet address' })
  @ApiResponse({ status: 200, description: 'Wallet found' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async findByAddress(@Param('address') address: string) {
    return this.walletService.findByAddress(address);
  }

  /**
   * Get all wallets
   * GET /api/wallets
   */
  @Get()
  @ApiOperation({ summary: 'Get all wallets' })
  @ApiResponse({ status: 200, description: 'List of all wallets' })
  async findAll() {
    return this.walletService.findAll();
  }

  /**
   * Update wallet by address
   * PATCH /api/wallets/:address
   */
  @Patch(':address')
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
