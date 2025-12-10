import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';

@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Create new wallet
   * POST /api/wallets
   */
  @Post()
  async create(@Body() dto: CreateWalletDto) {
    return this.walletService.create(dto);
  }

  /**
   * Get wallet by address
   * GET /api/wallets/:address
   */
  @Get(':address')
  async findByAddress(@Param('address') address: string) {
    return this.walletService.findByAddress(address);
  }

  /**
   * Get all wallets
   * GET /api/wallets
   */
  @Get()
  async findAll() {
    return this.walletService.findAll();
  }
}
