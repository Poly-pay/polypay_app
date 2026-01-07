import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Create a new account',
    description:
      'Register a new user account with a zero-knowledge commitment. This is the first step for new users.',
  })
  @ApiBody({
    type: CreateAccountDto,
    examples: {
      example1: {
        summary: 'Create new account',
        value: {
          commitment:
            '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
          name: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Account already exists',
  })
  async create(@Body() dto: CreateAccountDto) {
    return this.accountService.create(dto);
  }

  /**
   * Get current user account
   * GET /api/accounts/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user account',
    description: 'Retrieve the authenticated user account details.',
  })
  @ApiResponse({ status: 200, description: 'Account found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user multi-signature wallets',
    description:
      'Returns all multi-signature wallets where the authenticated user is a member, including their role (creator or participant) in each wallet.',
  })
  @ApiResponse({ status: 200, description: 'Wallets retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update current user account',
    description: 'Update the authenticated user account information.',
  })
  @ApiBody({
    type: UpdateAccountDto,
    examples: {
      example1: {
        summary: 'Update account name',
        value: {
          name: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Account updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all accounts',
    description: 'Retrieve a list of all registered accounts (admin use).',
  })
  @ApiResponse({ status: 200, description: 'List of all accounts' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async findAll() {
    return this.accountService.findAll();
  }
}
