import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountDto, UpdateAccountDto } from '@polypay/shared';

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

  @Patch(':commitment')
  update(
    @Param('commitment') commitment: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountService.update(commitment, dto);
  }
}
