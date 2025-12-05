import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ZkVerifyService } from './zkverify.service';
import { ProposeTxAndSubmitProofDto } from './dto/propose-tx.dto';
import { SignTxDto } from './dto/sign-tx.dto';

@Controller('zkverify')
export class ZkVerifyController {
  constructor(private readonly zkVerifyService: ZkVerifyService) {}

  /**
   * PROPOSE: Create new transaction + submit first proof
   * POST /api/zkverify/propose
   */
  @Post('propose')
  async proposeTx(@Body() dto: ProposeTxAndSubmitProofDto) {
    return this.zkVerifyService.proposeTxAndSubmitProof(dto);
  }

  /**
   * SIGN: Add proof to existing transaction
   * POST /api/zkverify/sign
   */
  @Post('sign')
  async signTx(@Body() dto: SignTxDto) {
    return this.zkVerifyService.signTx(dto);
  }

  /**
   * EXECUTE: Get all proofs for transaction
   * GET /api/zkverify/execute/:txId
   */
  @Get('execute/:txId')
  async getProofsForExecution(@Param('txId', ParseIntPipe) txId: number) {
    return this.zkVerifyService.getProofsForExecution(txId);
  }

  /**
   * Mark transaction as executed (after smart contract call)
   * PATCH /api/zkverify/executed/:txId
   */
  @Patch('executed/:txId')
  async markExecuted(@Param('txId', ParseIntPipe) txId: number) {
    return this.zkVerifyService.markTxExecuted(txId);
  }
}
