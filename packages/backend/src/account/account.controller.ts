import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountDto, UpdateAccountDto } from '@polypay/shared';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Account } from '@/generated/prisma/client';

@ApiTags('accounts')
@Controller('accounts')
export class AccountController {
  private readonly logger = new Logger(AccountController.name);
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
   * Get current user account
   * GET /api/accounts/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user account' })
  @ApiResponse({ status: 200, description: 'Account found' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getMe(@CurrentUser() user: Account) {
    return this.accountService.findByCommitment(user.commitment);
  }

  /**
   * Get wallets for current user
   * GET /api/accounts/me/wallets
   */
  @Get('me/wallets')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all wallets for current user' })
  @ApiResponse({ status: 200, description: 'Wallets retrieved successfully' })
  async getMyWallets(@CurrentUser() user: Account) {
    this.logger.log(`Fetching wallets for account: ${user.commitment}`);
    return this.accountService.getWallets(user.commitment);
  }

  /**
   * Update current user account
   * PATCH /api/accounts/me
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current user account' })
  @ApiBody({ type: UpdateAccountDto })
  @ApiResponse({ status: 200, description: 'Account updated successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async updateMe(@CurrentUser() user: Account, @Body() dto: UpdateAccountDto) {
    return this.accountService.update(user.commitment, dto);
  }

  /**
   * Get all accounts
   * GET /api/accounts
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all accounts' })
  @ApiResponse({ status: 200, description: 'List of all accounts' })
  async findAll() {
    return this.accountService.findAll();
  }
}
