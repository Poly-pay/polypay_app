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

  logLogin(walletAddress: string, zkVerifyTxHash?: string) {
    try {
      const timestamp = new Date().toISOString();
      const txHash = zkVerifyTxHash || 'PENDING';
      const logEntry = `${timestamp} | LOGIN | ${walletAddress} | ${txHash}\n`;

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
    zkVerifyTxHash?: string,
  ) {
    this.logAction(
      'APPROVE',
      userAddress,
      accountAddress,
      nonce,
      zkVerifyTxHash,
    );
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
    zkVerifyTxHash?: string,
  ) {
    this.logAction(
      'ADD_SIGNER',
      userAddress,
      accountAddress,
      nonce,
      zkVerifyTxHash,
    );
  }

  logRemoveSigner(
    userAddress: string | undefined,
    accountAddress: string,
    nonce: number,
    zkVerifyTxHash?: string,
  ) {
    this.logAction(
      'REMOVE_SIGNER',
      userAddress,
      accountAddress,
      nonce,
      zkVerifyTxHash,
    );
  }

  logUpdateThreshold(
    userAddress: string | undefined,
    accountAddress: string,
    nonce: number,
    zkVerifyTxHash?: string,
  ) {
    this.logAction(
      'UPDATE_THRESHOLD',
      userAddress,
      accountAddress,
      nonce,
      zkVerifyTxHash,
    );
  }

  logCreateAccount(userAddress: string | undefined, accountAddress: string) {
    try {
      const timestamp = new Date().toISOString();
      const addr = userAddress || 'UNKNOWN';
      const logEntry = `${timestamp} | CREATE_ACCOUNT | ${addr} | ${accountAddress} | - | -\n`;

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
        `Logged CREATE_ACCOUNT: ${addr.substring(0, 10)}... | ${accountAddress.substring(0, 10)}...`,
      );
    } catch (error) {
      this.logger.error(`Failed to write analytics log: ${error.message}`);
    }
  }

  logExecuteOnChain(
    userAddress: string | undefined,
    accountAddress: string,
    nonce: number,
    horizenTxHash: string,
  ) {
    try {
      const timestamp = new Date().toISOString();
      const addr = userAddress || 'UNKNOWN';
      const logEntry = `${timestamp} | EXECUTE | ${addr} | ${accountAddress} | ${nonce} | ${horizenTxHash}\n`;

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
        `Logged EXECUTE: ${addr.substring(0, 10)}... | ${accountAddress.substring(0, 10)}... | ${nonce}`,
      );
    } catch (error) {
      this.logger.error(`Failed to write analytics log: ${error.message}`);
    }
  }

  private logAction(
    action: string,
    userAddress: string | undefined,
    accountAddress: string,
    nonce: number,
    zkVerifyTxHash?: string,
  ) {
    try {
      const timestamp = new Date().toISOString();
      const addr = userAddress || 'UNKNOWN';
      const txHash = zkVerifyTxHash || 'PENDING';
      const logEntry = `${timestamp} | ${action} | ${addr} | ${accountAddress} | ${nonce} | ${txHash}\n`;

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
