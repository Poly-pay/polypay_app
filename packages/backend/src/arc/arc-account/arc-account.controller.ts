import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ArcAuthGuard } from '../arc-auth/arc-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { ArcAccountService } from './arc-account.service';
import { CreateArcAccountDto } from './dto/create-arc-account.dto';

@ApiTags('arc-accounts')
@Controller('arc/accounts')
@UseGuards(ArcAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ArcAccountController {
  constructor(private readonly arcAccountService: ArcAccountService) {}

  /**
   * Create a new Arc multisig account
   * POST /api/arc/accounts
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new Arc multisig account',
    description:
      'Deploys MetaMultiSigWalletArc on the Arc testnet with the given owner addresses and threshold.',
  })
  @ApiBody({ type: CreateArcAccountDto })
  @ApiResponse({ status: 201, description: 'Arc account created' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async create(@Body() dto: CreateArcAccountDto) {
    return this.arcAccountService.create(dto);
  }

  /**
   * Get Arc accounts the logged-in address is a signer on
   * GET /api/arc/accounts
   */
  @Get()
  @ApiOperation({
    summary: 'List Arc accounts for the logged-in address',
    description:
      'Returns all Arc multisig accounts where the authenticated address is a signer.',
  })
  @ApiResponse({ status: 200, description: 'Arc accounts found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async findMine(@CurrentUser() user: { address: string }) {
    return this.arcAccountService.findByOwner(user.address);
  }
}
