import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import {
  ZkVerifySubmitResponse,
  ZkVerifyJobStatusResponse,
} from './dto/zkverify-response.dto';
import {
  horizenMainnet,
  horizenTestnet,
  NetworkType,
  NetworkValue,
  ULTRAHONK_CONTRACT_VERSION,
} from '@polypay/shared';
import { CONFIG_KEYS } from '@/config/config.keys';
import {
  HTTP_TIMEOUT_DEFAULT,
  RETRY_DELAY_BASE,
  ZK_API_MAX_RETRIES,
  ZK_FINALIZE_MAX_ATTEMPTS,
  ZK_POLLING_DELAY,
} from '@/common/constants/timing';

export type CircuitType = 'transaction' | 'auth';

function getProofType(contractVersion: number): string {
  return contractVersion >= ULTRAHONK_CONTRACT_VERSION
    ? 'ultrahonk'
    : 'ultraplonk';
}

function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Buffer.from(bytes).toString('hex');
}

@Injectable()
export class ZkVerifyService {
  private readonly logger = new Logger(ZkVerifyService.name);
  private readonly apiUrl;
  private readonly apiKey: string;
  private readonly assetsDir: string;
  private readonly defaultChainId: number;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>(
      CONFIG_KEYS.RELAYER_ZK_VERIFY_API_KEY,
    );
    this.assetsDir = path.join(process.cwd(), 'assets');

    // Get network config from env
    const network = (this.configService.get<string>(CONFIG_KEYS.APP_NETWORK) ||
      'testnet') as NetworkType;
    this.defaultChainId =
      network === NetworkValue.mainnet ? horizenMainnet.id : horizenTestnet.id;
    this.apiUrl =
      network === NetworkValue.mainnet
        ? 'https://api.kurier.xyz/api/v1'
        : 'https://api-testnet.kurier.xyz/api/v1';
  }

  /**
   * Get vkey file path by circuit type
   */
  private getVkeyPath(
    circuitType: CircuitType,
    contractVersion: number,
  ): string {
    const proofType = getProofType(contractVersion);
    return path.join(this.assetsDir, `vkey-${circuitType}-${proofType}.json`);
  }

  private async retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries: number = ZK_API_MAX_RETRIES,
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
          if (error.response?.data) {
            this.logger.error(
              `Response body: ${JSON.stringify(error.response.data)}`,
            );
          }
          throw error;
        }

        const delay = Math.pow(2, attempt - 1) * RETRY_DELAY_BASE;
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
   * @param dto - Proof data
   * @param circuitType - Circuit type: 'transaction' or 'auth'
   */
  async submitProofAndWaitFinalized(
    dto: {
      proof: number[];
      publicInputs: string[];
      vk?: string;
    },
    circuitType: CircuitType = 'transaction',
    chainId?: number,
    contractVersion: number = 1,
  ): Promise<{ jobId: string; status: string; txHash?: string }> {
    const proofUint8 = new Uint8Array(dto.proof);
    const numberOfPublicInputs = dto.publicInputs?.length || 1;
    const vkHash = await this.loadOrRegisterVk(
      circuitType,
      contractVersion,
      dto.vk,
      numberOfPublicInputs,
    );

    const effectiveChainId = chainId ?? this.defaultChainId;
    const proofType = getProofType(contractVersion);

    let params: Record<string, unknown>;

    if (contractVersion >= ULTRAHONK_CONTRACT_VERSION) {
      // UltraHonk: hex proof + separate publicSignals
      params = {
        proofType,
        vkRegistered: true,
        chainId: effectiveChainId,
        proofOptions: { variant: 'Plain' },
        proofData: {
          proof: bytesToHex(proofUint8),
          publicSignals: dto.publicInputs,
          vk: vkHash,
        },
      };
    } else {
      // UltraPlonk: base64-encoded proof with concatenated public inputs
      params = {
        proofType,
        vkRegistered: true,
        chainId: effectiveChainId,
        proofOptions: { numberOfPublicInputs },
        proofData: {
          proof: Buffer.from(
            this.concatenatePublicInputsAndProof(dto.publicInputs, proofUint8),
          ).toString('base64'),
          vk: vkHash,
        },
      };
    }

    this.logger.log(
      `Submitting ${circuitType} proof (${proofType}) to zkVerify...`,
    );
    const submitResponse = await this.retryRequest(
      () =>
        axios.post<ZkVerifySubmitResponse>(
          `${this.apiUrl}/submit-proof/${this.apiKey}`,
          params,
          { timeout: HTTP_TIMEOUT_DEFAULT },
        ),
      ZK_API_MAX_RETRIES,
      'submitProof',
    );

    if (submitResponse.data.optimisticVerify !== 'success') {
      this.logger.error(
        `Proof verification failed. Response: ${JSON.stringify(submitResponse.data)}`,
      );
      throw new BadRequestException('Proof verification failed');
    }

    this.logger.log(`Proof submitted, jobId: ${submitResponse.data.jobId}`);

    const result = await this.waitForFinalized(submitResponse.data.jobId);

    return {
      jobId: submitResponse.data.jobId,
      status: result.status,
      txHash: result.txHash,
    };
  }

  async getJobStatus(jobId: string): Promise<ZkVerifyJobStatusResponse> {
    try {
      const response = await axios.get<ZkVerifyJobStatusResponse>(
        `${this.apiUrl}/job-status/${this.apiKey}/${jobId}`,
        { timeout: 30_000 },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get job status: ${error.message}`);
      throw new BadRequestException('Failed to get job status');
    }
  }

  private async waitForFinalized(
    jobId: string,
    maxAttempts = ZK_FINALIZE_MAX_ATTEMPTS,
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
        await new Promise((resolve) => setTimeout(resolve, ZK_POLLING_DELAY));
      } catch (error) {
        this.logger.error(`Error checking job status: ${error.message}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, ZK_POLLING_DELAY));
    throw new BadRequestException('Timeout waiting for aggregation');
  }

  /**
   * Register VK for a specific circuit type
   */
  private async registerVk(
    circuitType: CircuitType,
    contractVersion: number,
    vk: string,
    numberOfPublicInputs: number,
  ): Promise<void> {
    const vkeyPath = this.getVkeyPath(circuitType, contractVersion);
    const proofType = getProofType(contractVersion);

    let params: Record<string, unknown>;

    if (contractVersion >= ULTRAHONK_CONTRACT_VERSION) {
      // UltraHonk: hex VK
      const hexVk =
        typeof vk === 'string' && !vk.startsWith('0x') ? `0x${vk}` : vk;
      params = {
        proofType,
        vk: hexVk,
        proofOptions: { variant: 'Plain' },
      };
    } else {
      // UltraPlonk: base64 VK, numberOfPublicInputs in proofOptions
      params = {
        proofType,
        vk,
        proofOptions: { numberOfPublicInputs },
      };
    }

    this.logger.log(`Registering VK for ${circuitType} circuit...`);
    const response = await axios.post(
      `${this.apiUrl}/register-vk/${this.apiKey}`,
      params,
    );

    const dir = path.dirname(vkeyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(vkeyPath, JSON.stringify(response.data));
    this.logger.log(`VK registered successfully for ${circuitType} circuit`);
  }

  /**
   * Read and validate vkHash from cached file.
   * Returns vkHash if valid, null otherwise.
   */
  private readVkHash(vkeyPath: string): string | null {
    try {
      if (!fs.existsSync(vkeyPath)) return null;
      const vkData = JSON.parse(fs.readFileSync(vkeyPath, 'utf-8'));
      const vkHash = vkData.vkHash || vkData.meta?.vkHash;
      return vkHash || null;
    } catch {
      return null;
    }
  }

  /**
   * Load or register VK for a specific circuit type.
   * Self-healing: if the cached file is invalid, it re-registers automatically.
   */
  private async loadOrRegisterVk(
    circuitType: CircuitType,
    contractVersion: number,
    vk?: string,
    numberOfPublicInputs?: number,
  ): Promise<string> {
    const vkeyPath = this.getVkeyPath(circuitType, contractVersion);

    // Try reading from cached file first
    const cachedVkHash = this.readVkHash(vkeyPath);
    if (cachedVkHash) return cachedVkHash;

    // Need to register — vk is required
    if (!vk) {
      throw new BadRequestException(
        `VK required for first registration of ${circuitType} circuit (${getProofType(contractVersion)})`,
      );
    }

    // Clean up invalid file if exists
    if (fs.existsSync(vkeyPath)) {
      this.logger.warn(`Removing invalid VK cache file: ${vkeyPath}`);
      fs.unlinkSync(vkeyPath);
    }

    // Retry registration up to 3 times
    const maxRetries = ZK_API_MAX_RETRIES;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.registerVk(
          circuitType,
          contractVersion,
          vk,
          numberOfPublicInputs,
        );
        await this.sleep(ZK_POLLING_DELAY);
        break;
      } catch (error: any) {
        this.logger.error(
          `VK registration attempt ${attempt}/${maxRetries} failed for ${circuitType}: ${error.message}`,
        );
        if (attempt === maxRetries) {
          // Re-check cache — another concurrent request may have succeeded
          const concurrentVkHash = this.readVkHash(vkeyPath);
          if (concurrentVkHash) return concurrentVkHash;

          if (fs.existsSync(vkeyPath)) fs.unlinkSync(vkeyPath);
          throw new BadRequestException(
            `VK registration failed for ${circuitType} circuit after ${maxRetries} attempts`,
          );
        }
        await this.sleep(RETRY_DELAY_BASE * Math.pow(2, attempt - 1));
      }
    }

    const vkHash = this.readVkHash(vkeyPath);
    if (!vkHash) {
      if (fs.existsSync(vkeyPath)) fs.unlinkSync(vkeyPath);
      throw new BadRequestException(
        `VK registration succeeded but failed to read vkHash for ${circuitType} circuit`,
      );
    }

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
