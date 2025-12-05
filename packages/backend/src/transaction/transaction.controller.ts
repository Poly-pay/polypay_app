import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import {
  CreateTransactionDto,
  TransactionResponseDto,
  TransactionsResponseDto,
} from './dto';
import { TxStatus } from '../generated/prisma/client';

@Controller('transactions')
export class TransactionController {
  private readonly logger = new Logger(TransactionController.name);

  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateTransactionDto): Promise<TransactionResponseDto> {
    this.logger.log(`Creating transaction: ${createDto.txId}`);
    const transaction = await this.transactionService.create(createDto);

    return {
      success: true,
      data: transaction,
      message: 'Transaction created successfully',
    };
  }

  @Get()
  async findAll(@Query('status') status?: TxStatus): Promise<TransactionsResponseDto> {
    this.logger.log(`Getting transactions, status: ${status || 'all'}`);
    const transactions = await this.transactionService.findAll(status);

    return {
      success: true,
      data: transactions,
      count: transactions.length,
    };
  }

  @Get('pending')
  async findPending(): Promise<TransactionsResponseDto> {
    const transactions = await this.transactionService.findPending();

    return {
      success: true,
      data: transactions,
      count: transactions.length,
    };
  }

  @Get('ready')
  async findReady(): Promise<TransactionsResponseDto> {
    const transactions = await this.transactionService.findReady();

    return {
      success: true,
      data: transactions,
      count: transactions.length,
    };
  }

  @Get(':txId')
  async findByTxId(@Param('txId', ParseIntPipe) txId: number): Promise<TransactionResponseDto> {
    this.logger.log(`Getting transaction: ${txId}`);
    const transaction = await this.transactionService.findByTxId(txId);

    return {
      success: true,
      data: transaction,
    };
  }

  @Patch(':txId/executed')
  async markExecuted(@Param('txId', ParseIntPipe) txId: number): Promise<TransactionResponseDto> {
    this.logger.log(`Marking transaction ${txId} as executed`);
    const transaction = await this.transactionService.markExecuted(txId);

    return {
      success: true,
      data: transaction,
      message: 'Transaction marked as executed',
    };
  }
}