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
import { CreateAccountDto, UpdateAccountDto } from '@polypay/shared';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { AccountMemberGuard } from '@/auth/guards/account-member.guard';
import { User } from '@/generated/prisma/client';
import { AccountService } from './account.service';

@ApiTags('accounts')
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /**
   * Create new multisig account
   * POST /api/accounts
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new multisig account',
    description:
      'Deploy a new multisig account on-chain. The creator is automatically added as a signer.',
  })
  @ApiBody({
    type: CreateAccountDto,
    examples: {
      example1: {
        summary: '2-of-3 multisig account',
        value: {
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
          threshold: 2,
          name: 'Team Treasury',
          signers: [
            {
              name: 'Alice',
              commitment:
                '18712425590517920354542306734510523399880577119526949113387807668582286743210',
            },
            {
              name: 'Bob',
              commitment:
                '29312425590517920354542306734510523399880577119526949113387807668582286743210',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async create(@CurrentUser() user: User, @Body() dto: CreateAccountDto) {
    return this.accountService.create(dto, user.commitment, dto.userAddress);
  }

  /**
   * Get multisig account by address
   * GET /api/accounts/:address
   */
  @Get(':address')
  @UseGuards(JwtAuthGuard, AccountMemberGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get multisig account details by address',
    description:
      'Retrieve detailed information about a multisig account including signers, threshold, and transaction history. Only account signers can access this.',
  })
  @ApiParam({
    name: 'address',
    description: 'Account contract address (0x...)',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @ApiResponse({ status: 200, description: 'Account found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not an account signer',
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async findByAddress(@Param('address') address: string) {
    return this.accountService.findByAddress(address);
  }

  /**
   * Update multisig account by address
   * PATCH /api/accounts/:address
   */
  @Patch(':address')
  @UseGuards(JwtAuthGuard, AccountMemberGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update multisig account information',
    description:
      'Update account metadata such as name or description. Only account signers can update.',
  })
  @ApiParam({
    name: 'address',
    description: 'Account contract address (0x...)',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @ApiBody({
    type: UpdateAccountDto,
    examples: {
      example1: {
        summary: 'Update account name',
        value: {
          name: 'Updated Team Treasury',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Account updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not an account signer',
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async update(
    @Param('address') address: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountService.update(address, dto);
  }
}
