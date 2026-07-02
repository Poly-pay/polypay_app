import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ArcAuthGuard } from '../arc-auth/arc-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { ArcTransactionService } from './arc-transaction.service';
import { CreateArcTransactionDto } from './dto/create-arc-transaction.dto';
import { ApproveArcTransactionDto } from './dto/approve-arc-transaction.dto';

@ApiTags('arc-transactions')
@Controller('arc/transactions')
@UseGuards(ArcAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ArcTransactionController {
  constructor(private readonly arcTransactionService: ArcTransactionService) {}

  /**
   * Propose a new Arc transaction (signed off-chain by the proposer).
   * POST /api/arc/transactions
   */
  @Post()
  @ApiOperation({
    summary: 'Propose a new Arc multisig transaction',
    description:
      'Creates a transaction + first vote from an EIP-191 signature over getTransactionHash(nonce, to, value, data).',
  })
  @ApiBody({ type: CreateArcTransactionDto })
  @ApiResponse({ status: 201, description: 'Arc transaction proposed' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or signer not an owner',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid token or signature',
  })
  async propose(
    @CurrentUser() user: { address: string },
    @Body() dto: CreateArcTransactionDto,
  ) {
    return this.arcTransactionService.propose(dto, user.address);
  }

  /**
   * Next nonce the backend would assign for a new proposal on this
   * account. The proposer must sign over this exact nonce (the contract's
   * `execute` takes the nonce as a parameter, checked against `usedNonces`).
   * GET /api/arc/transactions/next-nonce?accountId=...
   */
  @Get('next-nonce')
  @ApiOperation({
    summary: 'Get the next nonce for a new Arc transaction proposal',
  })
  @ApiQuery({
    name: 'accountId',
    required: true,
    description: 'Arc account id',
  })
  @ApiResponse({ status: 200, description: 'Next nonce' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - caller is not a signer of this account',
  })
  async nextNonce(
    @CurrentUser() user: { address: string },
    @Query('accountId') accountId: string,
  ) {
    if (!accountId) {
      throw new BadRequestException('accountId query parameter is required');
    }
    const nonce = await this.arcTransactionService.nextNonce(
      accountId,
      user.address,
    );
    return { nonce };
  }

  /**
   * List Arc transactions for an account.
   * GET /api/arc/transactions?accountId=...
   */
  @Get()
  @ApiOperation({
    summary: 'List Arc transactions for an account',
  })
  @ApiQuery({
    name: 'accountId',
    required: true,
    description: 'Arc account id',
  })
  @ApiResponse({ status: 200, description: 'Arc transactions found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - caller is not a signer of this account',
  })
  async list(
    @CurrentUser() user: { address: string },
    @Query('accountId') accountId: string,
  ) {
    if (!accountId) {
      throw new BadRequestException('accountId query parameter is required');
    }
    return this.arcTransactionService.getTransactions(accountId, user.address);
  }

  /**
   * Approve a pending Arc transaction with an additional signature.
   * POST /api/arc/transactions/:txId/approve
   */
  @Post(':txId/approve')
  @ApiOperation({
    summary: 'Approve a pending Arc transaction',
    description:
      'Adds a vote from an EIP-191 signature over the same transaction hash.',
  })
  @ApiParam({ name: 'txId', type: 'number' })
  @ApiBody({ type: ApproveArcTransactionDto })
  @ApiResponse({ status: 201, description: 'Vote recorded' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - already voted or signer not an owner',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid token or signature',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async approve(
    @CurrentUser() user: { address: string },
    @Param('txId', ParseIntPipe) txId: number,
    @Body() dto: ApproveArcTransactionDto,
  ) {
    return this.arcTransactionService.approve(txId, dto, user.address);
  }

  /**
   * Execute an Arc transaction on-chain via the relayer once threshold is met.
   * POST /api/arc/transactions/:txId/execute
   */
  @Post(':txId/execute')
  @ApiOperation({
    summary: 'Execute an approved Arc transaction on-chain',
    description:
      'Submits the collected signatures to MetaMultiSigWalletArc.execute via the relayer.',
  })
  @ApiParam({ name: 'txId', type: 'number' })
  @ApiResponse({ status: 201, description: 'Transaction executed on-chain' })
  @ApiResponse({ status: 400, description: 'Bad request - threshold not met' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async execute(@Param('txId', ParseIntPipe) txId: number) {
    return this.arcTransactionService.execute(txId);
  }
}
