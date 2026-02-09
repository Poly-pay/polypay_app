import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from '@/auth/guards/admin.guard';
import { AnalyticsReportDto } from './dto/analytics-report.dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics-report')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Get analytics report CSV',
    description: 'Generate analytics report from database. Requires admin API key.',
  })
  @ApiHeader({
    name: 'X-Admin-Key',
    description: 'Admin API key',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'CSV file' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async getAnalyticsReport(
    @Query() dto: AnalyticsReportDto,
    @Res() res: Response,
  ) {
    const csv = await this.adminService.generateAnalyticsReport(dto);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=analytics-report.csv',
    );
    return res.send(csv);
  }
}
