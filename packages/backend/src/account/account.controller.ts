import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AccountService } from './account.service';
import { CreateAccountDto, UpdateAccountDto } from '@polypay/shared';

@ApiTags('accounts')
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /**
   * Create new account
   * POST /api/accounts
   */
  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  @ApiBody({ type: CreateAccountDto })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() dto: CreateAccountDto) {
    return this.accountService.create(dto);
  }

  /**
   * Get account by commitment
   * GET /api/accounts/:commitment
   */
  @Get(':commitment')
  @ApiOperation({ summary: 'Get account by commitment' })
  @ApiParam({ name: 'commitment', description: 'Account commitment hash' })
  @ApiResponse({ status: 200, description: 'Account found' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async findByCommitment(@Param('commitment') commitment: string) {
    return this.accountService.findByCommitment(commitment);
  }

  /**
   * Get wallets for account
   * GET /api/accounts/:commitment/wallets
   */
  @Get(':commitment/wallets')
  @ApiOperation({ summary: 'Get all wallets for an account' })
  @ApiParam({ name: 'commitment', description: 'Account commitment hash' })
  @ApiResponse({ status: 200, description: 'Wallets retrieved successfully' })
  async getWallets(@Param('commitment') commitment: string) {
    return this.accountService.getWallets(commitment);
  }

  @Patch(':commitment')
  @ApiOperation({ summary: 'Update account information' })
  @ApiParam({ name: 'commitment', description: 'Account commitment hash' })
  @ApiBody({ type: UpdateAccountDto })
  @ApiResponse({ status: 200, description: 'Account updated successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  update(
    @Param('commitment') commitment: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountService.update(commitment, dto);
  }

  /**
   * Get all accounts
   * GET /api/accounts
   */
  @Get()
  @ApiOperation({ summary: 'Get all accounts' })
  @ApiResponse({ status: 200, description: 'List of all accounts' })
  async findAll() {
    return this.accountService.findAll();
  }
}
