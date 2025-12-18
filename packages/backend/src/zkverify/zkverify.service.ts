import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import {
  SubmitProofDto,
  ZkVerifySubmitResponse,
  ZkVerifyJobStatusResponse,
  ProposeTxAndSubmitProofDto,
  SignTxDto,
} from './dto';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class ZkVerifyService {
  private readonly logger = new Logger(ZkVerifyService.name);
  private readonly apiUrl = 'https://relayer-api-testnet.horizenlabs.io/api/v1';
  private readonly apiKey: string;
  private readonly vkeyPath: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('RELAYER_ZKVERIFY_API_KEY');
    this.vkeyPath = path.join(process.cwd(), 'assets', 'vkey.json');
  }

  private async retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    operationName: string = 'request',
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if retryable error
        const isRetryable =
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ECONNREFUSED' ||
          error.message?.includes('timeout') ||
          error.message?.includes('network');

        if (!isRetryable || attempt === maxRetries) {
          this.logger.error(
            `${operationName} failed after ${attempt} attempts: ${error.message}`,
          );
          throw error;
        }

        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        this.logger.warn(
          `${operationName} attempt ${attempt} failed, retrying in ${delay}ms: ${error.code || error.message}`,
        );
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Submit proof and wait for finalized (IncludedInBlock)
   */
  async submitProofAndWaitFinalized(dto: {
    proof: number[];
    publicInputs: string[];
    vk?: string;
  }): Promise<{ jobId: string; status: string }> {
    const proofUint8 = new Uint8Array(dto.proof);
    const numberOfPublicInputs = dto.publicInputs?.length || 1;
    const vk = await this.loadOrRegisterVk(dto.vk, numberOfPublicInputs);

    const params = {
      proofType: 'ultraplonk',
      vkRegistered: true,
      chainId: 11155111,
      proofOptions: {
        numberOfPublicInputs,
      },
      proofData: {
        proof: Buffer.from(
          this.concatenatePublicInputsAndProof(dto.publicInputs, proofUint8),
        ).toString('base64'),
        vk,
      },
    };

    this.logger.log('Submitting proof to zkVerify...');
    const submitResponse = await this.retryRequest(
      () =>
        axios.post<ZkVerifySubmitResponse>(
          `${this.apiUrl}/submit-proof/${this.apiKey}`,
          params,
          { timeout: 30000 },
        ),
      3,
      'submitProof',
    );

    if (submitResponse.data.optimisticVerify !== 'success') {
      return { jobId: '', status: 'Failed' };
    }

    this.logger.log(`Proof submitted, jobId: ${submitResponse.data.jobId}`);

    // Wait for IncludedInBlock (finalized)
    const result = await this.waitForFinalized(submitResponse.data.jobId);

    return {
      jobId: submitResponse.data.jobId,
      status: result.status,
    };
  }

  async getJobStatus(jobId: string): Promise<ZkVerifyJobStatusResponse> {
    try {
      const response = await axios.get<ZkVerifyJobStatusResponse>(
        `${this.apiUrl}/job-status/${this.apiKey}/${jobId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get job status: ${error.message}`);
      throw new BadRequestException('Failed to get job status');
    }
  }

  private async waitForFinalized(
    jobId: string,
    maxAttempts = 30,
  ): Promise<ZkVerifyJobStatusResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await axios.get<ZkVerifyJobStatusResponse>(
          `${this.apiUrl}/job-status/${this.apiKey}/${jobId}`,
        );

        // Status should be Finalized
        // But when I test it IncludedInBlock -> AggregationPending. Not have Finalized between that state (maybe a bug or state switch to fast)
        if (response.data.status === 'IncludedInBlock') {
          this.logger.log('Job Finalized successfully');
          return response.data;
        }

        this.logger.log(`Job status: ${response.data.status}, waiting...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (error) {
        this.logger.error(`Error checking job status: ${error.message}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
    throw new BadRequestException('Timeout waiting for aggregation');
  }

  private async registerVk(
    vk: string,
    numberOfPublicInputs: number,
  ): Promise<void> {
    const params = {
      proofType: 'ultraplonk',
      vk,
      proofOptions: {
        numberOfPublicInputs,
      },
    };

    try {
      this.logger.log('Registering VK...');
      const response = await axios.post(
        `${this.apiUrl}/register-vk/${this.apiKey}`,
        params,
      );
      const dir = path.dirname(this.vkeyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.vkeyPath, JSON.stringify(response.data));
      this.logger.log('VK registered successfully');
    } catch (error: any) {
      this.logger.error('VK registration failed:', error.message);
      this.logger.warn('VK registration error, saving response...');

      const dir = path.dirname(this.vkeyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.vkeyPath,
        JSON.stringify(error.response?.data || {}),
      );
    }
  }

  private async loadOrRegisterVk(
    vk?: string,
    numberOfPublicInputs?: number,
  ): Promise<string> {
    if (!fs.existsSync(this.vkeyPath)) {
      if (!vk) {
        throw new BadRequestException('VK required for first registration');
      }
      await this.registerVk(vk, numberOfPublicInputs);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const vkData = JSON.parse(fs.readFileSync(this.vkeyPath, 'utf-8'));
    const vkHash = vkData.vkHash || vkData.meta?.vkHash;
    return vkHash;
  }

  private hexToUint8Array(hex: string): Uint8Array {
    if (hex.startsWith('0x')) hex = hex.slice(2);
    if (hex.length % 2 !== 0) hex = '0' + hex;

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  private concatenatePublicInputsAndProof(
    publicInputsHex: string[],
    proofUint8: Uint8Array,
  ): Uint8Array {
    const publicInputBytesArray = publicInputsHex.flatMap((hex) =>
      Array.from(this.hexToUint8Array(hex)),
    );
    const publicInputBytes = new Uint8Array(publicInputBytesArray);

    this.logger.debug(
      `Public inputs length: ${publicInputBytes.length}, Proof length: ${proofUint8.length}`,
    );

    const newProof = new Uint8Array(
      publicInputBytes.length + proofUint8.length,
    );
    newProof.set(publicInputBytes, 0);
    newProof.set(proofUint8, publicInputBytes.length);

    return newProof;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
