import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MixerService } from './mixer.service';
import {
  MixerDepositsQueryDto,
  MixerWithdrawDto,
  RegisterVkDto,
} from '@polypay/shared';

@Controller('mixer')
export class MixerController {
  constructor(private readonly mixerService: MixerService) {}

  // TODO: remove this endpoint
  @Post('register-vk')
  async registerVk(@Body() dto: RegisterVkDto) {
    return this.mixerService.registerVk(dto.vk);
  }

  @Post('withdraw')
  async withdraw(@Body() dto: MixerWithdrawDto) {
    return this.mixerService.withdraw(dto);
  }

  @Get('deposits')
  async getDeposits(@Query() query: MixerDepositsQueryDto) {
    return this.mixerService.getDeposits(query);
  }

  @Get('deposit-count')
  async getDepositCount(
    @Query('chainId') chainId: string,
    @Query('token') token: string,
    @Query('denomination') denomination: string,
  ) {
    return this.mixerService.getDepositCount(
      Number(chainId),
      token,
      denomination,
    );
  }
}
