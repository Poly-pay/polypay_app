import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  hexToSignature,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import {
  RegisterStealthKeysDto,
  type RegisterStealthKeysResponse,
  type StealthRegistrationStatusResponse,
  getUmbraAddresses,
} from '@polypay/shared';
import { CONFIG_KEYS } from '@/config/config.keys';
import {
  STEALTH_CHAIN_ID,
  STEALTH_KEY_REGISTRY_ABI,
} from './stealth.constants';

@Injectable()
export class StealthService {
  private readonly logger = new Logger(StealthService.name);
  // viem's generic types over the chain object explode the TS instantiation
  // depth when stored on a class field. We only use vanilla methods so the
  // loose type is fine here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly publicClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly walletClient: any;
  private readonly registryAddress: Address;
  private readonly relayerAddress: Address;

  // In-memory status cache. Registry rarely changes, so a short TTL is enough
  // to absorb burst lookups during a batch propose.
  private readonly statusCache = new Map<
    string,
    { value: StealthRegistrationStatusResponse; expiresAt: number }
  >();
  private readonly cacheTtlMs = 60_000;

  constructor(private readonly config: ConfigService) {
    const rpcUrl = this.config.getOrThrow<string>(CONFIG_KEYS.STEALTH_RPC_URL);
    const relayerKey = this.config.getOrThrow<string>(
      CONFIG_KEYS.STEALTH_RELAYER_PRIVATE_KEY,
    );

    const account = privateKeyToAccount(relayerKey as `0x${string}`);
    this.relayerAddress = account.address;

    // Cast away Base's strict L2 chain type — we only use vanilla read/write
    // methods that work fine regardless of the chain's optimism stack types.
    this.publicClient = createPublicClient({
      chain: base as never,
      transport: http(rpcUrl),
    });
    this.walletClient = createWalletClient({
      chain: base as never,
      transport: http(rpcUrl),
      account,
    });

    const { registry } = getUmbraAddresses(STEALTH_CHAIN_ID);
    this.registryAddress = registry as Address;

    this.logger.log(
      `StealthService ready. Relayer ${this.relayerAddress}, registry ${this.registryAddress}`,
    );
  }

  async getStatus(
    walletAddress: string,
  ): Promise<StealthRegistrationStatusResponse> {
    const normalized = this.normalizeAddress(walletAddress);
    const cached = this.statusCache.get(normalized);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const result = (await this.publicClient.readContract({
      address: this.registryAddress,
      abi: STEALTH_KEY_REGISTRY_ABI,
      functionName: 'stealthKeys',
      args: [normalized as Address],
    })) as readonly [bigint, bigint, bigint, bigint];

    const [
      spendingPubKeyPrefix,
      spendingPubKey,
      viewingPubKeyPrefix,
      viewingPubKey,
    ] = result;

    const registered = spendingPubKey !== 0n && viewingPubKey !== 0n;
    const response: StealthRegistrationStatusResponse = registered
      ? {
          walletAddress: normalized,
          registered,
          spendingPubKeyPrefix: Number(spendingPubKeyPrefix),
          spendingPubKey: this.toHex32(spendingPubKey),
          viewingPubKeyPrefix: Number(viewingPubKeyPrefix),
          viewingPubKey: this.toHex32(viewingPubKey),
        }
      : { walletAddress: normalized, registered };

    this.statusCache.set(normalized, {
      value: response,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
    return response;
  }

  async register(
    dto: RegisterStealthKeysDto,
  ): Promise<RegisterStealthKeysResponse> {
    const existing = await this.getStatus(dto.walletAddress);
    if (
      existing.registered &&
      existing.spendingPubKey?.toLowerCase() ===
        dto.spendingPubKey.toLowerCase() &&
      existing.viewingPubKey?.toLowerCase() === dto.viewingPubKey.toLowerCase()
    ) {
      throw new BadRequestException(
        'Wallet already registered with these keys',
      );
    }

    const { v, r, s } = this.splitSignature(dto.signature);

    try {
      const txHash = await this.walletClient.writeContract({
        address: this.registryAddress,
        abi: STEALTH_KEY_REGISTRY_ABI,
        functionName: 'setStealthKeysOnBehalf',
        args: [
          this.normalizeAddress(dto.walletAddress) as Address,
          BigInt(dto.spendingPubKeyPrefix),
          BigInt(dto.spendingPubKey),
          BigInt(dto.viewingPubKeyPrefix),
          BigInt(dto.viewingPubKey),
          v,
          r,
          s,
        ],
        chain: base as never,
        account: this.walletClient.account!,
      });

      // Invalidate cache so the next status read reflects the new registration.
      this.statusCache.delete(this.normalizeAddress(dto.walletAddress));

      this.logger.log(
        `Submitted setStealthKeysOnBehalf for ${dto.walletAddress} tx=${txHash}`,
      );

      return {
        txHash,
        registryAddress: this.registryAddress,
        chainId: STEALTH_CHAIN_ID,
      };
    } catch (err) {
      this.logger.error(
        `setStealthKeysOnBehalf failed for ${dto.walletAddress}: ${(err as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Failed to submit stealth registration on chain',
      );
    }
  }

  private normalizeAddress(value: string): string {
    return value.toLowerCase();
  }

  private toHex32(value: bigint): string {
    return `0x${value.toString(16).padStart(64, '0')}`;
  }

  private splitSignature(signature: string): {
    v: number;
    r: `0x${string}`;
    s: `0x${string}`;
  } {
    const split = hexToSignature(signature as `0x${string}`);
    // viem returns v as bigint; the registry expects uint8.
    const v = Number(split.v);
    if (v !== 27 && v !== 28) {
      throw new BadRequestException('Invalid signature v value');
    }
    return { v, r: split.r, s: split.s };
  }
}
