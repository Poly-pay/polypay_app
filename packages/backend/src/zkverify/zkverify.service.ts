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

  /**
   * PROPOSE: Create new transaction + submit first proof
   */
  async proposeTxAndSubmitProof(dto: ProposeTxAndSubmitProofDto) {
    // 1. Check if nullifier already used
    const existingProof = await this.prisma.proofJob.findUnique({
      where: { nullifier: dto.nullifier },
    });
    if (existingProof) {
      throw new BadRequestException('Nullifier already used');
    }

    // 2. Submit proof to zkVerify
    const proofResult = await this.submitProofToZkVerify({
      proof: dto.proof,
      publicInputs: dto.publicInputs,
      vk: dto.vk,
    });

    if (proofResult.status === 'Failed') {
      throw new BadRequestException('Proof verification failed at zkVerify');
    }

    // 3. Create transaction and first proof job in a transaction
    const transaction = await this.prisma.$transaction(async () => {
      const tx = await this.prisma.transaction.create({
        data: {
          txId: dto.txId,
          to: dto.to,
          value: dto.value,
          callData: dto.callData || '0x',
          signaturesRequired: dto.signaturesRequired,
          status: 'PENDING',
        },
      });

      this.logger.log(
        `Created transaction with ID: ${tx.id}, txId: ${tx.txId}`,
      );
      await this.prisma.proofJob.create({
        data: {
          txId: tx.txId,
          nullifier: dto.nullifier,
          jobId: proofResult.jobId,
          status: 'VERIFIED',
        },
      });
      return tx;
    });

    return {
      transaction: {
        txId: transaction.txId,
        to: transaction.to,
        value: transaction.value,
        status: transaction.status,
      },
      proofJob: {
        jobId: proofResult.jobId,
        nullifier: dto.nullifier,
      },
    };
  }

  /**
   * SIGN: Add proof to existing transaction
   */
  async signTx(dto: SignTxDto) {
    // 1. Check transaction exists
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId: dto.txId },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${dto.txId} not found`);
    }
    if (transaction.status === 'EXECUTED') {
      throw new BadRequestException('Transaction already executed');
    }

    // 2. Check if nullifier already used
    const existingProof = await this.prisma.proofJob.findUnique({
      where: { nullifier: dto.nullifier },
    });
    if (existingProof) {
      throw new BadRequestException('Nullifier already used');
    }

    // 3. Get all proof not aggregated of tx and get data from zkverify
    await this.aggregateProofs(dto.txId);

    // 4. Submit proof to zkVerify
    const proofResult = await this.submitProofToZkVerify({
      proof: dto.proof,
      publicInputs: dto.publicInputs,
      vk: dto.vk,
    });

    if (proofResult.status === 'Failed') {
      throw new BadRequestException('Proof verification failed at zkVerify');
    }

    // 5. Create proof job
    await this.prisma.proofJob.create({
      data: {
        txId: dto.txId,
        nullifier: dto.nullifier,
        jobId: proofResult.jobId,
        status: 'VERIFIED',
      },
    });

    return {
      txId: dto.txId,
      proofJob: {
        jobId: proofResult.jobId,
        nullifier: dto.nullifier,
      },
      signatureCount: await this.getSignatureCount(dto.txId),
    };
  }

  /**
   * EXECUTE: Get all proofs for transaction
   */
  async getProofsForExecution(txId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${txId} not found`);
    }

    // Aggregated proofs
    await this.aggregateProofs(txId);

    const proofJobs = await this.prisma.proofJob.findMany({
      where: {
        txId,
        status: 'AGGREGATED',
      },
    });

    if (proofJobs.length < transaction.signaturesRequired) {
      throw new BadRequestException(
        `Not enough signatures. Required: ${transaction.signaturesRequired}, Got: ${proofJobs.length}`,
      );
    }

    // Format proofs for smart contract
    const zkProofs = proofJobs.map((job) => ({
      nullifier: job.nullifier,
      aggregationId: job.aggregationId,
      domainId: job.domainId ?? 0,
      zkMerklePath: job.merkleProof,
      leafCount: job.leafCount,
      index: job.leafIndex,
    }));

    return {
      transaction: {
        txId: transaction.txId,
        to: transaction.to,
        value: transaction.value,
        callData: transaction.callData,
        status: transaction.status,
      },
      zkProofs,
      signatureCount: proofJobs.length,
      signaturesRequired: transaction.signaturesRequired,
    };
  }

  /**
   * Mark transaction as executed
   */
  async markTxExecuted(txId: number) {
    const updated = await this.prisma.transaction.update({
      where: { txId },
      data: {
        status: 'EXECUTED',
        executedAt: new Date(),
      },
    });
    return updated;
  }

  async submitProof(
    submitDto: SubmitProofDto,
  ): Promise<ZkVerifyJobStatusResponse> {
    const { proof, publicInputs, vk } = submitDto;

    try {
      const proofUint8 = new Uint8Array(proof);
      const numberOfPublicInputs = publicInputs?.length || 1;

      if (!fs.existsSync(this.vkeyPath)) {
        if (!vk) {
          throw new BadRequestException('VK required for first registration');
        }
        await this.registerVk(vk, numberOfPublicInputs);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      const vkData = JSON.parse(fs.readFileSync(this.vkeyPath, 'utf-8'));
      const vkHash = vkData.vkHash || vkData.meta?.vkHash;

      const params = {
        proofType: 'ultraplonk',
        vkRegistered: true,
        chainId: 11155111,
        proofOptions: {
          numberOfPublicInputs,
        },
        proofData: {
          proof: Buffer.from(
            this.concatenatePublicInputsAndProof(publicInputs, proofUint8),
          ).toString('base64'),
          vk: vkHash,
        },
      };

      this.logger.log('Submitting proof to zkVerify...');
      const submitResponse = await axios.post<ZkVerifySubmitResponse>(
        `${this.apiUrl}/submit-proof/${this.apiKey}`,
        params,
      );

      if (submitResponse.data.optimisticVerify !== 'success') {
        throw new BadRequestException('Proof verification failed');
      }

      this.logger.log(`Proof submitted, jobId: ${submitResponse.data.jobId}`);

      const result = await this.waitForFinalized(submitResponse.data.jobId);
      return result;
    } catch (error) {
      this.logger.error('Submit proof error:', error.message);
      throw new BadRequestException(error.message || 'Failed to submit proof');
    }
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

  private async submitProofToZkVerify(dto: SubmitProofDto) {
    const vk = await this.loadOrRegisterVk();
    const proofUint8 = new Uint8Array(dto.proof);
    const numberOfPublicInputs = dto.publicInputs?.length || 1;

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
    const submitResponse = await axios.post<ZkVerifySubmitResponse>(
      `${this.apiUrl}/submit-proof/${this.apiKey}`,
      params,
    );

    if (submitResponse.data.optimisticVerify !== 'success') {
      throw new BadRequestException('Proof verification failed');
    }

    this.logger.log(`Proof submitted, jobId: ${submitResponse.data.jobId}`);

    const result = await this.waitForFinalized(submitResponse.data.jobId);
    return result;
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
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
    throw new BadRequestException('Timeout waiting for aggregation');
  }

  private async aggregateProofs(txId: number) {
    const allProofsNotAggregated = await this.prisma.proofJob.findMany({
      where: {
        txId,
        status: 'VERIFIED',
      },
    });

    allProofsNotAggregated.map(async (proof) => {
      const response = await axios.get<ZkVerifyJobStatusResponse>(
        `${this.apiUrl}/job-status/${this.apiKey}/${proof.jobId}`,
      );
      if (response.data.status === 'Aggregated') {
        this.logger.log('Job Finalized successfully');
        // update proof job
        await this.prisma.proofJob.update({
          where: { id: proof.id },
          data: {
            status: 'AGGREGATED',
            aggregationId: response.data.aggregationId?.toString(),
            merkleProof: response.data.aggregationDetails.merkleProof,
            leafCount: response.data.aggregationDetails.numberOfLeaves,
            leafIndex: response.data.aggregationDetails.leafIndex,
          },
        });
      }
    });
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

  private async getSignatureCount(txId: number) {
    return this.prisma.proofJob.count({
      where: { txId, status: 'VERIFIED' },
    });
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
