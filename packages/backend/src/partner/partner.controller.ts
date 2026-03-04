import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PartnerService } from './partner.service';
import { PartnerGuard } from '@/auth/guards/partner.guard';
import { AccountReportDto } from './dto/account-report.dto';

@ApiTags('partner')
@Controller('partner')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Get('accounts')
  @UseGuards(PartnerGuard)
  @ApiOperation({
    summary: 'Get accounts report CSV',
    description:
      'List created multisig accounts with optional date range and chain info. Requires partner API key.',
  })
  @ApiHeader({
    name: 'X-Partner-Key',
    description: 'Partner API key',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'CSV file' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async getAccountReport(
    @Query() dto: AccountReportDto,
    @Res() res: Response,
  ) {
    const csv = await this.partnerService.generateAccountReport(dto);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=accounts-report.csv',
    );
    return res.send(csv);
  }
}
