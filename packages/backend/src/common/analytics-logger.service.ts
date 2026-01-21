import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AnalyticsLoggerService {
  private readonly logger = new Logger(AnalyticsLoggerService.name);
  private readonly logDir = path.join(process.cwd(), 'logs');
  private readonly logPath = path.join(this.logDir, 'user-analytics.log');

  constructor() {
    this.ensureLogDirectoryExists();
  }

  private ensureLogDirectoryExists() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
      this.logger.log(`Created logs directory: ${this.logDir}`);
    }
  }

  logLogin(walletAddress: string) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp} | LOGIN | ${walletAddress}\n`;

      const delay = Math.floor(Math.random() * 500);

      setTimeout(() => {
        try {
          this.ensureLogDirectoryExists();
          fs.appendFileSync(this.logPath, logEntry, 'utf8');
        } catch (error) {
          this.logger.error(`Failed to write analytics log: ${error.message}`);
        }
      }, delay);

      this.logger.debug(
        `Logged user login: ${walletAddress.substring(0, 10)}...`,
      );
    } catch (error) {
      this.logger.error(`Failed to write analytics log: ${error.message}`);
    }
  }

  logApprove(
    userAddress: string | undefined,
    accountAddress: string,
    nonce: number,
  ) {
    this.logAction('APPROVE', userAddress, accountAddress, nonce);
  }

  logExecute(
    userAddress: string | undefined,
    accountAddress: string,
    nonce: number,
  ) {
    this.logAction('EXECUTE', userAddress, accountAddress, nonce);
  }

  logDeny(
    userAddress: string | undefined,
    accountAddress: string,
    nonce: number,
  ) {
    this.logAction('DENY', userAddress, accountAddress, nonce);
  }

  logAddSigner(
    userAddress: string | undefined,
    accountAddress: string,
    nonce: number,
  ) {
    this.logAction('ADD_SIGNER', userAddress, accountAddress, nonce);
  }

  logRemoveSigner(
    userAddress: string | undefined,
    accountAddress: string,
    nonce: number,
  ) {
    this.logAction('REMOVE_SIGNER', userAddress, accountAddress, nonce);
  }

  logUpdateThreshold(
    userAddress: string | undefined,
    accountAddress: string,
    nonce: number,
  ) {
    this.logAction('UPDATE_THRESHOLD', userAddress, accountAddress, nonce);
  }

  private logAction(
    action: string,
    userAddress: string | undefined,
    accountAddress: string,
    nonce: number,
  ) {
    try {
      const timestamp = new Date().toISOString();
      const addr = userAddress || 'UNKNOWN';
      const logEntry = `${timestamp} | ${action} | ${addr} | ${accountAddress} | ${nonce}\n`;

      const delay = Math.floor(Math.random() * 500);

      setTimeout(() => {
        try {
          this.ensureLogDirectoryExists();
          fs.appendFileSync(this.logPath, logEntry, 'utf8');
        } catch (error) {
          this.logger.error(`Failed to write analytics log: ${error.message}`);
        }
      }, delay);

      this.logger.debug(
        `Logged ${action}: ${addr.substring(0, 10)}... | ${accountAddress.substring(0, 10)}... | ${nonce}`,
      );
    } catch (error) {
      this.logger.error(`Failed to write analytics log: ${error.message}`);
    }
  }

  getLogPath(): string {
    return this.logPath;
  }
}
