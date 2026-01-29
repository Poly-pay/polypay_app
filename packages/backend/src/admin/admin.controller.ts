import { Controller, Get, Res } from '@nestjs/common';
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

  // TODO: Add ADMIN_API_KEY authentication later
  @Get('analytics-log')
  getAnalyticsLog(@Res() res: Response) {
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
