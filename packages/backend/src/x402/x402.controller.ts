import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  Req,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Facilitator, X402Service } from './x402.service';
import { DepositRequestDto } from './dto/deposit-request.dto';
import type { X402DepositResponse } from '@polypay/shared';

function resourceUrlFromRequest(req: Request): string {
  const host =
    (req.headers['x-forwarded-host'] as string | undefined) ??
    req.get('host') ??
    'localhost';
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined) ??
    req.protocol ??
    'http';
  return `${proto}://${host}${req.originalUrl}`;
}

@Controller('x402')
@UseGuards(ThrottlerGuard)
export class X402Controller {
  constructor(private readonly x402Service: X402Service) {}

  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @Get('deposit/:multisigAddress')
  async discovery(
    @Param('multisigAddress') multisigAddress: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const body = await this.x402Service.buildDiscoveryResponse(
      multisigAddress,
      resourceUrlFromRequest(req),
      Facilitator.PayAI,
    );
    res.status(HttpStatus.PAYMENT_REQUIRED).json(body);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('deposit/:multisigAddress')
  async deposit(
    @Param('multisigAddress') multisigAddress: string,
    @Headers('x-payment') paymentHeader: string | undefined,
    @Body() body: DepositRequestDto,
    @Req() req: Request,
  ): Promise<X402DepositResponse> {
    return this.x402Service.processDeposit(
      multisigAddress,
      paymentHeader,
      body?.memo,
      resourceUrlFromRequest(req),
      Facilitator.PayAI,
    );
  }

  // Bazaar path — routed through Coinbase CDP so the endpoint is indexed at
  // agentic.market. Same DTO shape as the PayAI path; only the facilitator
  // differs. Returns 404 implicitly if CDP is not configured (service throws).
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @Get('bazaar/deposit/:multisigAddress')
  async bazaarDiscovery(
    @Param('multisigAddress') multisigAddress: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const body = await this.x402Service.buildDiscoveryResponse(
      multisigAddress,
      resourceUrlFromRequest(req),
      Facilitator.CDP,
    );
    res.status(HttpStatus.PAYMENT_REQUIRED).json(body);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('bazaar/deposit/:multisigAddress')
  async bazaarDeposit(
    @Param('multisigAddress') multisigAddress: string,
    @Headers('x-payment') paymentHeader: string | undefined,
    @Body() body: DepositRequestDto,
    @Req() req: Request,
  ): Promise<X402DepositResponse> {
    return this.x402Service.processDeposit(
      multisigAddress,
      paymentHeader,
      body?.memo,
      resourceUrlFromRequest(req),
      Facilitator.CDP,
    );
  }
}
