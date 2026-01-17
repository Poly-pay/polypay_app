import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Analytics Logger Service
 *
 * Purpose: Track user wallet addresses for analytics without storing in database
 * Privacy: Completely isolated from User table and commitments
 *
 * Log Format: timestamp | LOGIN | address
 * Example: 2026-01-09T10:30:15.234Z | LOGIN | 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
 */
@Injectable()
export class AnalyticsLoggerService {
  private readonly logger = new Logger(AnalyticsLoggerService.name);
  private readonly logDir = path.join(process.cwd(), 'logs');
  private readonly logPath = path.join(this.logDir, 'user-analytics.log');

  constructor() {
    this.ensureLogDirectoryExists();
  }

  /**
   * Ensure logs directory exists
   */
  private ensureLogDirectoryExists() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
      this.logger.log(`Created logs directory: ${this.logDir}`);
    }
  }

  /**
   * Log user login with wallet address
   *
   * Privacy note: This address is NOT stored in database and has NO relation
   * to the commitment stored in the Account table. The log file is completely
   * isolated for analytics purposes only.
   *
   * @param walletAddress - User's wallet address from MetaMask
   */
  logLogin(walletAddress: string) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp} | LOGIN | ${walletAddress}\n`;

      // Add random delay (0-500ms) to prevent timing correlation attacks
      // This makes it harder to link log entries to database records by timestamp
      const delay = Math.floor(Math.random() * 500);

      setTimeout(() => {
        fs.appendFileSync(this.logPath, logEntry, 'utf8');
      }, delay);

      this.logger.debug(
        `Logged user login: ${walletAddress.substring(0, 10)}...`,
      );
    } catch (error) {
      // Don't throw error - analytics logging should not break auth flow
      this.logger.error(`Failed to write analytics log: ${error.message}`);
    }
  }

  /**
   * Get log file path (for testing/debugging)
   */
  getLogPath(): string {
    return this.logPath;
  }
}
