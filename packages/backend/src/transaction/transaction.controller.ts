import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import {
  CreateTransactionDto,
  ApproveTransactionDto,
  DenyTransactionDto,
} from '@polypay/shared';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@ApiTags('transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  /**
   * Create new transaction (+ auto approve)
   * POST /api/transactions
   */
  @Post()
  @ApiOperation({ summary: 'Create a new transaction (auto-approved)' })
  @ApiBody({ type: CreateTransactionDto })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createTransaction(@Body() dto: CreateTransactionDto) {
    return this.transactionService.createTransaction(dto);
  }

  /**
   * Get all transactions for a wallet
   * GET /api/transactions?walletAddress=xxx&status=PENDING
   */
  @Get()
  @ApiOperation({ summary: 'Get all transactions for a wallet' })
  @ApiQuery({
    name: 'walletAddress',
    required: true,
    description: 'Wallet address',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Transaction status filter',
  })
  @ApiResponse({ status: 200, description: 'List of transactions' })
  async getTransactions(
    @Query('walletAddress') walletAddress: string,
    @Query('status') status?: string,
  ) {
    return this.transactionService.getTransactions(walletAddress, status);
  }

  /**
   * Get single transaction
   * GET /api/transactions/:txId
   */
  @Get(':txId')
  @ApiOperation({ summary: 'Get a single transaction by ID' })
  @ApiParam({ name: 'txId', type: 'number', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@Param('txId', ParseIntPipe) txId: number) {
    return this.transactionService.getTransaction(txId);
  }

  /**
   * Approve transaction
   * POST /api/transactions/:txId/approve
   */
  @Post(':txId/approve')
  @ApiOperation({ summary: 'Approve a transaction' })
  @ApiParam({ name: 'txId', type: 'number', description: 'Transaction ID' })
  @ApiBody({ type: ApproveTransactionDto })
  @ApiResponse({
    status: 200,
    description: 'Transaction approved successfully',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async approve(
    @Param('txId', ParseIntPipe) txId: number,
    @Body() dto: ApproveTransactionDto,
  ) {
    return this.transactionService.approve(txId, dto);
  }

  /**
   * Deny transaction
   * POST /api/transactions/:txId/deny
   */
  @Post(':txId/deny')
  @ApiOperation({ summary: 'Deny a transaction' })
  @ApiParam({ name: 'txId', type: 'number', description: 'Transaction ID' })
  @ApiBody({ type: DenyTransactionDto })
  @ApiResponse({ status: 200, description: 'Transaction denied successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async deny(
    @Param('txId', ParseIntPipe) txId: number,
    @Body() dto: DenyTransactionDto,
  ) {
    return this.transactionService.deny(txId, dto);
  }

  /**
   * Get execution data (proofs for smart contract)
   * GET /api/transactions/:txId/execute
   */
  @Get(':txId/execute')
  async getExecutionData(@Param('txId', ParseIntPipe) txId: number) {
    return this.transactionService.getExecutionData(txId);
  }

  /**
   * Mark transaction as executed
   * PATCH /api/transactions/:txId/executed
   */
  @Patch(':txId/executed')
  async markExecuted(
    @Param('txId', ParseIntPipe) txId: number,
    @Body('txHash') txHash: string,
  ) {
    return this.transactionService.markExecuted(txId, txHash);
  }

  @Post(':txId/execute')
  async executeOnChain(@Param('txId', ParseIntPipe) txId: number) {
    return this.transactionService.executeOnChain(txId);
  }

  @Post('reserve-nonce')
  async reserveNonce(@Body('walletAddress') walletAddress: string) {
    return this.transactionService.reserveNonce(walletAddress);
  }
}
