import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /**
   * Create new account
   * POST /api/accounts
   */
  @Post()
  async create(@Body() dto: CreateAccountDto) {
    return this.accountService.create(dto);
  }

  /**
   * Get account by commitment
   * GET /api/accounts/:commitment
   */
  @Get(':commitment')
  async findByCommitment(@Param('commitment') commitment: string) {
    return this.accountService.findByCommitment(commitment);
  }

  /**
   * Get wallets for account
   * GET /api/accounts/:commitment/wallets
   */
  @Get(':commitment/wallets')
  async getWallets(@Param('commitment') commitment: string) {
    return this.accountService.getWallets(commitment);
  }
}
