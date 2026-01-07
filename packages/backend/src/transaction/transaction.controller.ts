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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import {
  CreateTransactionDto,
  ApproveTransactionDto,
  DenyTransactionDto,
} from '@polypay/shared';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { TransactionAccessGuard } from '@/auth/guards/transaction-access.guard';
import { Account } from '@/generated/prisma/client';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  /**
   * Create new transaction (+ auto approve)
   * POST /api/transactions
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new transaction with auto-approval',
    description:
      'Propose a new transaction in a multi-signature wallet. The transaction is automatically approved by the creator and requires additional approvals from other members.',
  })
  @ApiBody({
    type: CreateTransactionDto,
    examples: {
      example1: {
        summary: 'Transfer USDC tokens',
        value: {
          walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
          to: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
          value: '0',
          data: '0xa9059cbb0000000000000000000000008ba1f109551bd432803012645ac136ddd64dba720000000000000000000000000000000000000000000000000000000005f5e100',
          nonce: 1,
          proof: [47, 5, 66, 187, 'etc...'],
          publicSignals: ['0x111...', '0x222...', '0x333...'],
        },
      },
      example2: {
        summary: 'Native ETH transfer',
        value: {
          walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
          to: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
          value: '1000000000000000000',
          data: '0x',
          nonce: 2,
          proof: [47, 5, 66, 187, 'etc...'],
          publicSignals: ['0x111...', '0x222...', '0x333...'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async createTransaction(
    @CurrentUser() user: Account,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionService.createTransaction(dto, user.commitment);
  }

  /**
   * Get all transactions for a wallet
   * GET /api/transactions?walletAddress=xxx&status=PENDING
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all transactions for a wallet',
    description:
      'Retrieve all transactions for a specific wallet. Optionally filter by status (PENDING, APPROVED, REJECTED, EXECUTED).',
  })
  @ApiQuery({
    name: 'walletAddress',
    required: true,
    description: 'Wallet contract address',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Transaction status filter',
    enum: ['PENDING', 'EXECUTED', 'FAILED'],
  })
  @ApiResponse({ status: 200, description: 'List of transactions' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async getTransactions(
    @CurrentUser() user: Account,
    @Query('walletAddress') walletAddress: string,
    @Query('status') status?: string,
  ) {
    return this.transactionService.getTransactions(
      walletAddress,
      user.commitment,
      status,
    );
  }

  /**
   * Get single transaction
   * GET /api/transactions/:txId
   */
  @Get(':txId')
  @UseGuards(JwtAuthGuard, TransactionAccessGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get a single transaction by txId',
    description:
      'Retrieve detailed information about a specific transaction including votes and proofs. Use txId (integer) as the identifier, not the internal id (CUID string).',
  })
  @ApiParam({
    name: 'txId',
    type: 'number',
    description:
      'Transaction ID (auto-incrementing integer, NOT the internal CUID)',
    example: 123,
  })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not a wallet member',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@Param('txId', ParseIntPipe) txId: number) {
    return this.transactionService.getTransaction(txId);
  }

  /**
   * Approve transaction
   * POST /api/transactions/:txId/approve
   */
  @Post(':txId/approve')
  @UseGuards(JwtAuthGuard, TransactionAccessGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Approve a transaction with ZK proof',
    description:
      'Submit an approval vote for a pending transaction using a zero-knowledge proof. Once the threshold is reached, the transaction can be executed. Use txId (integer) as the identifier.',
  })
  @ApiParam({
    name: 'txId',
    type: 'number',
    description: 'Transaction ID (auto-incrementing integer)',
    example: 123,
  })
  @ApiBody({
    type: ApproveTransactionDto,
    examples: {
      example1: {
        summary: 'Approve transaction',
        value: {
          proof: [47, 5, 66, 187, 'etc...'],
          publicSignals: ['0x111...', '0x222...', '0x333...'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction approved successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid proof' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not a wallet member or already voted',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async approve(
    @CurrentUser() user: Account,
    @Param('txId', ParseIntPipe) txId: number,
    @Body() dto: ApproveTransactionDto,
  ) {
    return this.transactionService.approve(txId, dto, user.commitment);
  }

  /**
   * Deny transaction
   * POST /api/transactions/:txId/deny
   */
  @Post(':txId/deny')
  @UseGuards(JwtAuthGuard, TransactionAccessGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Deny/Reject a transaction',
    description:
      'Submit a rejection vote for a pending transaction. Wallet members can reject transactions they disagree with. Use txId (integer) as the identifier.',
  })
  @ApiParam({
    name: 'txId',
    type: 'number',
    description: 'Transaction ID (auto-incrementing integer)',
    example: 123,
  })
  @ApiResponse({ status: 200, description: 'Transaction denied successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not a wallet member or already voted',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async deny(
    @CurrentUser() user: Account,
    @Param('txId', ParseIntPipe) txId: number,
    @Body() dto: DenyTransactionDto,
  ) {
    return this.transactionService.deny(txId, dto, user.commitment);
  }

  /**
   * Get execution data (proofs for smart contract)
   * GET /api/transactions/:txId/execute
   */
  @Get(':txId/execute')
  @UseGuards(JwtAuthGuard, TransactionAccessGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get execution data for transaction',
    description:
      'Retrieve the aggregated zero-knowledge proofs and data needed to execute the transaction on-chain. Use txId (integer) as the identifier.',
  })
  @ApiParam({
    name: 'txId',
    type: 'number',
    description: 'Transaction ID (auto-incrementing integer)',
    example: 123,
  })
  @ApiResponse({
    status: 200,
    description: 'Execution data retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not a wallet member',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getExecutionData(@Param('txId', ParseIntPipe) txId: number) {
    return this.transactionService.getExecutionData(txId);
  }

  /**
   * Mark transaction as executed
   * PATCH /api/transactions/:txId/executed
   */
  @Patch(':txId/executed')
  @UseGuards(JwtAuthGuard, TransactionAccessGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Mark transaction as executed',
    description:
      'Update transaction status to executed after on-chain confirmation. Use txId (integer) as the identifier.',
  })
  @ApiParam({
    name: 'txId',
    type: 'number',
    description: 'Transaction ID (auto-incrementing integer)',
    example: 123,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        txHash: {
          type: 'string',
          example: '0xabcdef1234567890...',
          description: 'On-chain transaction hash',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction marked as executed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not a wallet member',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async markExecuted(
    @Param('txId', ParseIntPipe) txId: number,
    @Body('txHash') txHash: string,
  ) {
    return this.transactionService.markExecuted(txId, txHash);
  }

  /**
   * Execute transaction on-chain
   * POST /api/transactions/:txId/execute
   */
  @Post(':txId/execute')
  @UseGuards(JwtAuthGuard, TransactionAccessGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Execute approved transaction on-chain',
    description:
      'Submit the transaction to the blockchain once it has reached the approval threshold. This will use the relayer to submit the transaction. Use txId (integer) as the identifier.',
  })
  @ApiParam({
    name: 'txId',
    type: 'number',
    description: 'Transaction ID (auto-incrementing integer)',
    example: 123,
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction executed on-chain successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Threshold not reached',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not a wallet member',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async executeOnChain(@Param('txId', ParseIntPipe) txId: number) {
    return this.transactionService.executeOnChain(txId);
  }

  /**
   * Reserve nonce for new transaction
   * POST /api/transactions/reserve-nonce
   */
  @Post('reserve-nonce')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reserve a nonce for new transaction',
    description:
      'Reserve the next available nonce for a wallet to prevent nonce conflicts when creating transactions.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        walletAddress: {
          type: 'string',
          example: '0x1234567890abcdef1234567890abcdef12345678',
          description: 'Wallet contract address',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Nonce reserved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async reserveNonce(
    @CurrentUser() user: Account,
    @Body('walletAddress') walletAddress: string,
  ) {
    return this.transactionService.reserveNonce(walletAddress, user.commitment);
  }
}
