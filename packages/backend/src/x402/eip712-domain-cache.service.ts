import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createPublicClient, http } from 'viem';
import {
  USDC_TOKEN,
  getChainById,
  X402_SUPPORTED_CHAIN_IDS,
} from '@polypay/shared';

const NAME_ABI = [
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'version',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
] as const;

export interface Eip712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: `0x${string}`;
}

@Injectable()
export class Eip712DomainCacheService implements OnModuleInit {
  private readonly logger = new Logger(Eip712DomainCacheService.name);
  private readonly cache = new Map<number, Eip712Domain>();

  async onModuleInit(): Promise<void> {
    for (const chainId of X402_SUPPORTED_CHAIN_IDS) {
      const verifyingContract = USDC_TOKEN.addresses[chainId] as
        | `0x${string}`
        | undefined;
      if (!verifyingContract) {
        this.logger.warn(
          `USDC address missing for chainId ${chainId}, skipping domain prefetch`,
        );
        continue;
      }
      try {
        const domain = await this.readDomainFromChain(
          chainId,
          verifyingContract,
        );
        this.cache.set(chainId, domain);
        this.logger.log(
          `Cached EIP-712 domain for chain ${chainId}: name="${domain.name}" version="${domain.version}"`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to read EIP-712 domain for chain ${chainId}: ${
            (err as Error).message
          }`,
        );
      }
    }
  }

  get(chainId: number): Eip712Domain {
    const cached = this.cache.get(chainId);
    if (!cached) {
      throw new Error(`EIP-712 domain not cached for chain ${chainId}`);
    }
    return cached;
  }

  private async readDomainFromChain(
    chainId: number,
    verifyingContract: `0x${string}`,
  ): Promise<Eip712Domain> {
    const chain = getChainById(chainId);
    const client = createPublicClient({ chain, transport: http() });
    const [name, version] = await Promise.all([
      client.readContract({
        address: verifyingContract,
        abi: NAME_ABI,
        functionName: 'name',
      }),
      client.readContract({
        address: verifyingContract,
        abi: NAME_ABI,
        functionName: 'version',
      }),
    ]);
    return { name, version, chainId, verifyingContract };
  }
}
