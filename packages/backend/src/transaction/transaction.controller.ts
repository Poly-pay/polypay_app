import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto, ApproveTransactionDto, DenyTransactionDto } from '@polypay/shared';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  /**
   * Create new transaction (+ auto approve)
   * POST /api/transactions
   */
  @Post()
  async createTransaction(@Body() dto: CreateTransactionDto) {
    return this.transactionService.createTransaction(dto);
  }

  /**
   * Get all transactions for a wallet
   * GET /api/transactions?walletAddress=xxx&status=PENDING
   */
  @Get()
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
  async getTransaction(@Param('txId', ParseIntPipe) txId: number) {
    return this.transactionService.getTransaction(txId);
  }

  /**
   * Approve transaction
   * POST /api/transactions/:txId/approve
   */
  @Post(':txId/approve')
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
  async deny(@Param('txId', ParseIntPipe) txId: number, @Body() dto: DenyTransactionDto) {
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
}
