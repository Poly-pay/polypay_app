import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createPublicClient, http, parseAbiItem, keccak256, encodePacked } from 'viem';
import { getChainById, getContractConfigByChainId, MIXER_DEPLOYMENT_BLOCK } from '@polypay/shared';
import { PrismaService } from '@/database/prisma.service';

const MIXER_CHAIN_IDS = [2651420, 84532];
const BATCH_BLOCK_SIZE = 2000;

const DEPOSIT_EVENT = parseAbiItem(
  'event Deposit(bytes32 indexed commitment, uint256 leafIndex, uint256 timestamp, address indexed token, uint256 denomination)',
);

@Injectable()
export class MixerIndexerService {
  private readonly logger = new Logger(MixerIndexerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async indexDeposits() {
    for (const chainId of MIXER_CHAIN_IDS) {
      try {
        await this.indexChain(chainId);
      } catch (err: any) {
        this.logger.warn(`Mixer indexer chainId=${chainId}: ${err?.message}`);
      }
    }
  }

  private async indexChain(chainId: number) {
    const config = getContractConfigByChainId(chainId);
    const mixerAddress = config.mixerAddress;
    if (!mixerAddress || mixerAddress === '0x0000000000000000000000000000000000000000') {
      return;
    }

    const chain = getChainById(chainId);
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    const poolIdFor = (token: string, denomination: string) =>
      keccak256(encodePacked(['address', 'uint256'], [token as `0x${string}`, BigInt(denomination)]));

    let state = await this.prisma.mixerIndexerState.findUnique({
      where: { chainId },
    });

    const deploymentNumber = MIXER_DEPLOYMENT_BLOCK[chainId as keyof typeof MIXER_DEPLOYMENT_BLOCK] ?? 0;
    const deploymentBlock = BigInt(deploymentNumber);
    if (deploymentBlock === 0n) {
      this.logger.warn(
        `Mixer indexer chainId=${chainId}: no deployment block configured, skipping`,
      );
      return;
    }

    const fromBlock = state
      ? BigInt(state.lastIndexedBlock) + 1n
      : deploymentBlock;
    const toBlock = await publicClient.getBlockNumber();

    if (fromBlock > toBlock) {
      return;
    }

    const endBlock = fromBlock + BigInt(BATCH_BLOCK_SIZE) - 1n;
    const batchTo = endBlock > toBlock ? toBlock : endBlock;

    const logs = await publicClient.getLogs({
      address: mixerAddress as `0x${string}`,
      event: DEPOSIT_EVENT,
      fromBlock,
      toBlock: batchTo,
    });

    for (const log of logs) {
      const commitment = (log.args.commitment ?? log.topics?.[1] ?? '0x0') as string;
      const leafIndex = Number(log.args.leafIndex ?? 0n);
      const token = (log.args.token ?? '') as string;
      const denomination = String(log.args.denomination ?? 0n);
      const poolIdVal = poolIdFor(token, denomination);

      await this.prisma.mixerDeposit.upsert({
        where: {
          chainId_poolId_leafIndex: { chainId, poolId: poolIdVal, leafIndex },
        },
        create: {
          chainId,
          poolId: poolIdVal,
          leafIndex,
          commitment: commitment as string,
          token,
          denomination,
          blockNumber: Number(log.blockNumber ?? 0),
          txHash: log.transactionHash ?? '',
        },
        update: {},
      });
    }

    if (!state) {
      await this.prisma.mixerIndexerState.create({
        data: {
          chainId,
          lastIndexedBlock: Number(batchTo),
        },
      });
    } else {
      await this.prisma.mixerIndexerState.update({
        where: { chainId },
        data: { lastIndexedBlock: Number(batchTo) },
      });
    }

    if (logs.length > 0) {
      this.logger.log(`Mixer indexer chainId=${chainId}: indexed ${logs.length} deposits up to block ${batchTo}`);
    }
  }
}
