import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  RegisterStealthKeysDto,
  type RegisterStealthKeysResponse,
  type StealthRegistrationStatusResponse,
} from '@polypay/shared';
import { StealthService } from './stealth.service';

@Controller('stealth')
@UseGuards(ThrottlerGuard)
export class StealthController {
  constructor(private readonly stealthService: StealthService) {}

  // Heavier limit on register because it triggers an on-chain tx with our gas.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('register')
  async register(
    @Body() dto: RegisterStealthKeysDto,
  ): Promise<RegisterStealthKeysResponse> {
    return this.stealthService.register(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @Get('status/:walletAddress')
  async status(
    @Param('walletAddress') walletAddress: string,
  ): Promise<StealthRegistrationStatusResponse> {
    return this.stealthService.getStatus(walletAddress);
  }
}
