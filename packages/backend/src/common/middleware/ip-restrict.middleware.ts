import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class IpRestrictMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IpRestrictMiddleware.name);
  private readonly restrictedIps: Set<string>;

  constructor() {
    const ips = process.env.RESTRICTED_IPS || '';
    this.restrictedIps = new Set(
      ips
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean),
    );
    if (this.restrictedIps.size > 0) {
      this.logger.log(`Restricted IPs: ${[...this.restrictedIps].join(', ')}`);
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (this.restrictedIps.size === 0) return next();

    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
      req.ip;

    if (clientIp && this.restrictedIps.has(clientIp)) {
      this.logger.warn(
        `Blocked request from ${clientIp}: ${req.method} ${req.originalUrl}`,
      );
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  }
}
