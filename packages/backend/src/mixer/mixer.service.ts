import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { keccak256, encodePacked } from 'viem';
import { PrismaService } from '@/database/prisma.service';
import { ZkVerifyService } from '@/zkverify/zkverify.service';
import { RelayerService } from '@/relayer-wallet/relayer-wallet.service';
import { getDomainId } from '@/common/utils/proof';
import { MixerDepositsQueryDto, MixerWithdrawDto } from '@polypay/shared';

const MIXER_AGGREGATION_MAX_ATTEMPTS = 30;
const MIXER_AGGREGATION_INTERVAL_MS = 10000;

@Injectable()
export class MixerService {
  private readonly logger = new Logger(MixerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zkVerifyService: ZkVerifyService,
    private readonly relayerService: RelayerService,
  ) {}

  // TODO: remove this endpoint
  async registerVk(vk: string): Promise<{ vkHash: string }> {
    const vkHash = await this.zkVerifyService.registerMixerVk(vk);
    return { vkHash };
  }

  async withdraw(dto: MixerWithdrawDto): Promise<{ txHash: string; status: string }> {
    const { chainId, token, denomination, recipient, nullifierHash, root, proof, publicInputs } = dto;

    if (!publicInputs || publicInputs.length !== 5) {
      throw new BadRequestException('Mixer circuit expects exactly 5 public inputs');
    }

    this.logger.log(`Submitting mixer proof for chainId=${chainId}, recipient=${recipient}`);

    const { jobId, status: submitStatus } = await this.zkVerifyService.submitProofAndWaitFinalized(
      { proof, publicInputs, vk: dto.vk },
      'mixer',
      chainId,
    );

    if (submitStatus === 'Failed' || !jobId) {
      throw new BadRequestException('Proof submission failed');
    }

    const aggregationResult = await this.pollForAggregation(jobId);
    if (!aggregationResult) {
      throw new BadRequestException('MIXER_AGGREGATION_TIMEOUT');
    }

    const { aggregationId, aggregationDetails } = aggregationResult;
    const domainId = getDomainId(chainId);

    const txHash = await this.relayerService.executeMixerWithdraw(
      chainId,
      token,
      denomination,
      recipient,
      nullifierHash,
      root,
      {
        aggregationId: String(aggregationId),
        domainId,
        zkMerklePath: aggregationDetails.merkleProof || [],
        leafCount: aggregationDetails.numberOfLeaves ?? 0,
        index: aggregationDetails.leafIndex ?? 0,
      },
    );

    this.logger.log(`Mixer withdraw executed: txHash=${txHash}`);
    return { txHash, status: 'success' };
  }

  private async pollForAggregation(
    jobId: string,
    maxAttempts = MIXER_AGGREGATION_MAX_ATTEMPTS,
    intervalMs = MIXER_AGGREGATION_INTERVAL_MS,
  ): Promise<{ aggregationId?: number; aggregationDetails?: any } | null> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const jobStatus = await this.zkVerifyService.getJobStatus(jobId);
        if (jobStatus.status === 'Aggregated') {
          return {
            aggregationId: jobStatus.aggregationId,
            aggregationDetails: jobStatus.aggregationDetails,
          };
        }
        if (jobStatus.status === 'Failed') {
          throw new BadRequestException('Proof aggregation failed');
        }
        this.logger.log(`Mixer job ${jobId} status: ${jobStatus.status}, waiting...`);
      } catch (err: any) {
        this.logger.warn(`Error polling job ${jobId}: ${err?.message}`);
      }
      await this.sleep(intervalMs);
    }
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getDeposits(query: MixerDepositsQueryDto): Promise<{ commitments: string[]; leafIndices: number[] }> {
    const { chainId, token, denomination, fromLeaf = 0, toLeaf } = query;
    const poolId = this.getPoolId(token, denomination);

    const where: any = { chainId, poolId };
    if (toLeaf !== undefined) {
      where.leafIndex = { gte: fromLeaf, lte: toLeaf };
    } else {
      where.leafIndex = { gte: fromLeaf };
    }

    const deposits = await this.prisma.mixerDeposit.findMany({
      where,
      orderBy: { leafIndex: 'asc' },
    });

    return {
      commitments: deposits.map((d) => d.commitment),
      leafIndices: deposits.map((d) => d.leafIndex),
    };
  }

  async getDepositCount(chainId: number, token: string, denomination: string): Promise<number> {
    const poolId = this.getPoolId(token, denomination);
    return this.prisma.mixerDeposit.count({ where: { chainId, poolId } });
  }

  private getPoolId(token: string, denomination: string): string {
    return keccak256(encodePacked(['address', 'uint256'], [token as `0x${string}`, BigInt(denomination)]));
  }
}
