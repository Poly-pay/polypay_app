import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('admin')
export class AdminController {
  private readonly logPath = path.join(
    process.cwd(),
    'logs',
    'user-analytics.log',
  );

  @Get('analytics-log')
  getAnalyticsLog(
    @Headers('x-admin-key') adminKey: string,
    @Res() res: Response,
  ) {
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey || adminKey !== expectedKey) {
      throw new UnauthorizedException('Invalid admin key');
    }

    if (!fs.existsSync(this.logPath)) {
      return res.status(404).send('Log file not found');
    }

    const content = fs.readFileSync(this.logPath, 'utf8');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=user-analytics.log',
    );
    return res.send(content);
  }
}
