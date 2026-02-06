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

  /**
   * Write log to local file (for local development)
   */
  private writeFileLog(logEntry: string, debugMsg: string) {
    const delay = Math.floor(Math.random() * 500);

    setTimeout(() => {
      try {
        this.ensureLogDirectoryExists();
        fs.appendFileSync(this.logPath, logEntry, 'utf8');
      } catch (error) {
        this.logger.error(`Failed to write analytics log: ${error.message}`);
      }
    }, delay);

    this.logger.debug(debugMsg);
  }

  /**
   * Write structured JSON log for Cloud Logging
   */
  private writeCloudLog(data: {
    action: string;
    userAddress?: string;
    accountAddress?: string;
    txHash?: string;
  }) {
    const logEntry = {
      eventType: 'ANALYTICS',
      action: data.action,
      userAddress: data.userAddress || 'UNKNOWN',
      accountAddress: data.accountAddress || null,
      txHash: data.txHash || null,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(JSON.stringify(logEntry));
  }

  // LOGIN: timestamp | LOGIN | userAddress | txHash
  logLogin(walletAddress: string, zkVerifyTxHash?: string) {
    const timestamp = new Date().toISOString();
    const txHash = zkVerifyTxHash || 'PENDING';
    const logEntry = `${timestamp} | LOGIN | ${walletAddress} | ${txHash}\n`;

    this.writeFileLog(
      logEntry,
      `Logged LOGIN: ${walletAddress.substring(0, 10)}...`,
    );

    this.writeCloudLog({
      action: 'LOGIN',
      userAddress: walletAddress,
      txHash: zkVerifyTxHash,
    });
  }

  // CREATE_ACCOUNT: timestamp | CREATE_ACCOUNT | userAddress | accountAddress
  logCreateAccount(userAddress: string | undefined, accountAddress: string) {
    const timestamp = new Date().toISOString();
    const addr = userAddress || 'UNKNOWN';
    const logEntry = `${timestamp} | CREATE_ACCOUNT | ${addr} | ${accountAddress}\n`;

    this.writeFileLog(
      logEntry,
      `Logged CREATE_ACCOUNT: ${addr.substring(0, 10)}... | ${accountAddress.substring(0, 10)}...`,
    );

    this.writeCloudLog({
      action: 'CREATE_ACCOUNT',
      userAddress: userAddress,
      accountAddress: accountAddress,
    });
  }

  // Generic action log: timestamp | ACTION | userAddress | accountAddress | txHash
  private logAction(
    action: string,
    userAddress: string | undefined,
    accountAddress: string,
    txHash?: string,
  ) {
    const timestamp = new Date().toISOString();
    const addr = userAddress || 'UNKNOWN';
    const hash = txHash || 'PENDING';
    const logEntry = `${timestamp} | ${action} | ${addr} | ${accountAddress} | ${hash}\n`;

    this.writeFileLog(
      logEntry,
      `Logged ${action}: ${addr.substring(0, 10)}... | ${accountAddress.substring(0, 10)}...`,
    );

    this.writeCloudLog({
      action: action,
      userAddress: userAddress,
      accountAddress: accountAddress,
      txHash: txHash,
    });
  }

  logApprove(
    userAddress: string | undefined,
    accountAddress: string,
    zkVerifyTxHash?: string,
  ) {
    this.logAction('APPROVE', userAddress, accountAddress, zkVerifyTxHash);
  }

  logExecute(
    userAddress: string | undefined,
    accountAddress: string,
    horizenTxHash?: string,
  ) {
    this.logAction('EXECUTE', userAddress, accountAddress, horizenTxHash);
  }

  logDeny(userAddress: string | undefined, accountAddress: string) {
    this.logAction('DENY', userAddress, accountAddress);
  }

  logAddSigner(
    userAddress: string | undefined,
    accountAddress: string,
    zkVerifyTxHash?: string,
  ) {
    this.logAction('ADD_SIGNER', userAddress, accountAddress, zkVerifyTxHash);
  }

  logRemoveSigner(
    userAddress: string | undefined,
    accountAddress: string,
    zkVerifyTxHash?: string,
  ) {
    this.logAction(
      'REMOVE_SIGNER',
      userAddress,
      accountAddress,
      zkVerifyTxHash,
    );
  }

  logUpdateThreshold(
    userAddress: string | undefined,
    accountAddress: string,
    zkVerifyTxHash?: string,
  ) {
    this.logAction(
      'UPDATE_THRESHOLD',
      userAddress,
      accountAddress,
      zkVerifyTxHash,
    );
  }

  logTransfer(
    userAddress: string | undefined,
    accountAddress: string,
    zkVerifyTxHash?: string,
  ) {
    this.logAction('TRANSFER', userAddress, accountAddress, zkVerifyTxHash);
  }

  logBatchTransfer(
    userAddress: string | undefined,
    accountAddress: string,
    zkVerifyTxHash?: string,
  ) {
    this.logAction(
      'BATCH_TRANSFER',
      userAddress,
      accountAddress,
      zkVerifyTxHash,
    );
  }

  getLogPath(): string {
    return this.logPath;
  }
}
