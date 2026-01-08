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
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@polypay/shared';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { TransactionAccessGuard } from '@/auth/guards/transaction-access.guard';
import { User } from '@/generated/prisma/client';

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
      'Propose a new transaction in a multisig account. The transaction is automatically approved by the creator and requires additional approvals from other signers.',
  })
  @ApiBody({
    type: CreateTransactionDto,
    examples: {
      example1: {
        summary: 'Transfer USDC tokens',
        value: {
          contactId: '2f4-742d35-Cc-6634C-0532920-5a3b-844Bc9-e7595f-0bEb1',
          nonce: 1,
          nullifier: '200000000000000000000000000000000000000',
          proof: [47, 5, 66, 187, 'etc...'],
          publicInputs: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'],
          threshold: 1,
          to: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
          type: 'TRANSFER',
          value: '0',
          accountAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async createTransaction(
    @CurrentUser() user: User,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionService.createTransaction(dto, user.commitment);
  }

  /**
   * Get all transactions for an account
   * GET /api/transactions?accountAddress=xxx&status=PENDING
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get transactions for a multisig account with pagination',
    description:
      'Retrieve all transactions for a specific multisig account. Optionally filter by status (PENDING, EXECUTED, FAILED).',
  })
  @ApiQuery({
    name: 'accountAddress',
    required: true,
    description: 'Account contract address',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Transaction status filter',
    enum: ['PENDING', 'EXECUTED', 'FAILED'],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor for pagination (transaction ID)',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of transactions' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async getTransactions(
    @CurrentUser() user: User,
    @Query('accountAddress') accountAddress: string,
    @Query('status') status?: string,
    @Query('limit') limitParam?: string,
    @Query('cursor') cursor?: string,
  ) {
    const limit = Math.min(
      parseInt(limitParam || String(DEFAULT_PAGE_SIZE), 10) ||
        DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );

    return this.transactionService.getTransactions(
      accountAddress,
      user.commitment,
      status,
      limit,
      cursor,
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
    description: 'Forbidden - Not an account signer',
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
          publicInputs: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'],
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
    description: 'Forbidden - Not an account signer or already voted',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async approve(
    @CurrentUser() user: User,
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
      'Submit a rejection vote for a pending transaction. Account signers can reject transactions they disagree with. Use txId (integer) as the identifier.',
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
    description: 'Forbidden - Not an account signer or already voted',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async deny(
    @CurrentUser() user: User,
    @Param('txId', ParseIntPipe) txId: number,
  ) {
    return this.transactionService.deny(txId, user.commitment);
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
    description: 'Forbidden - Not an account signer',
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
    description: 'Forbidden - Not an account signer',
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
    description: 'Forbidden - Not an account signer',
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
      'Reserve the next available nonce for an account to prevent nonce conflicts when creating transactions.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        accountAddress: {
          type: 'string',
          example: '0x1234567890abcdef1234567890abcdef12345678',
          description: 'Account contract address',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Nonce reserved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async reserveNonce(
    @CurrentUser() user: User,
    @Body('accountAddress') accountAddress: string,
  ) {
    return this.transactionService.reserveNonce(
      accountAddress,
      user.commitment,
    );
  }
}
