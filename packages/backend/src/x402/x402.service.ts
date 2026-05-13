import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { createPublicClient, http } from 'viem';
import {
  USDC_TOKEN,
  getChainById,
  chainIdToFacilitatorNetwork,
  isX402SupportedChain,
} from '@polypay/shared';
import type {
  X402DepositResponse,
  X402DiscoveryResponse,
  X402PaymentRequirements,
  X402V1PaymentPayload,
} from '@polypay/shared';
import { PrismaService } from '@/database/prisma.service';
import { CONFIG_KEYS } from '@/config/config.keys';
import { recoverEip3009Signer } from './utils/eip3009-validator';
import { decodeXPaymentHeader } from './utils/x402-payment';
import { Eip712DomainCacheService } from './eip712-domain-cache.service';
import {
  MIN_DEPOSIT,
  MAX_DEPOSIT,
  AUTH_BUFFER_SECONDS,
  PER_MULTISIG_RATE_LIMIT_COUNT,
  PER_MULTISIG_RATE_LIMIT_WINDOW_MS,
} from './constants';

const USDC_AUTHORIZATION_STATE_ABI = [
  {
    name: 'authorizationState',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'authorizer', type: 'address' },
      { name: 'nonce', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

@Injectable()
export class X402Service {
  private readonly logger = new Logger(X402Service.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly domainCache: Eip712DomainCacheService,
  ) {}

  // ---------- public surface ----------

  async buildDiscoveryResponse(
    multisigAddress: string,
    resourceUrl: string,
  ): Promise<X402DiscoveryResponse> {
    const account = await this.assertAccount(multisigAddress);
    const requirements = this.buildPaymentRequirements(
      account.chainId,
      account.address,
      resourceUrl,
      MAX_DEPOSIT.toString(),
    );
    return { accepts: [requirements] };
  }

  async processDeposit(
    multisigAddress: string,
    paymentHeader: string | undefined,
    memo: string | undefined,
    resourceUrl: string,
  ): Promise<X402DepositResponse> {
    if (!paymentHeader) {
      throw new BadRequestException('Missing X-PAYMENT header');
    }
    const account = await this.assertAccount(multisigAddress);
    const payload = decodeXPaymentHeader(paymentHeader);

    await this.validatePayloadAgainstMultisig(
      payload,
      account.address,
      account.chainId,
    );
    await this.assertNonceUnused(
      payload.payload.authorization.from,
      payload.payload.authorization.nonce,
      account.chainId,
    );
    await this.assertPerMultisigRateLimit(account.address);

    const deposit = await this.prisma.x402Deposit.create({
      data: {
        buyerAddress: payload.payload.authorization.from.toLowerCase(),
        multisigAddress: account.address.toLowerCase(),
        principalAmount: payload.payload.authorization.value,
        principalAuthNonce: payload.payload.authorization.nonce.toLowerCase(),
        chainId: account.chainId,
        memo,
      },
    });

    // For verify/settle: maxAmountRequired must be <= auth.value (facilitator
    // checks `auth.value >= maxAmountRequired`). Use the exact signed amount.
    const requirements = this.buildPaymentRequirements(
      account.chainId,
      account.address,
      resourceUrl,
      payload.payload.authorization.value,
    );

    try {
      await this.facilitatorVerify(payload, requirements);
      const txHash = await this.facilitatorSettle(payload, requirements);
      const updated = await this.prisma.x402Deposit.update({
        where: { id: deposit.id },
        data: { status: 'SETTLED', principalTxHash: txHash },
      });
      return {
        principalTxHash: txHash,
        multisigAddress: account.address,
        depositedAmount: payload.payload.authorization.value,
        chainId: account.chainId,
        status: 'SETTLED',
        timestamp: updated.updatedAt.toISOString(),
      };
    } catch (err) {
      const message = this.shortenError(err);
      this.logger.error(`Deposit ${deposit.id} failed: ${message}`);
      await this.prisma.x402Deposit.update({
        where: { id: deposit.id },
        data: { status: 'FAILED', errorMessage: message },
      });
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Deposit settlement failed');
    }
  }

  // ---------- validation helpers ----------

  private async assertAccount(multisigAddress: string) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(multisigAddress)) {
      throw new BadRequestException('Invalid address format');
    }
    // x402 only supports Base chains, so we scope the lookup to those — this
    // also disambiguates when the same address exists on multiple chains
    // (Horizen + Base) due to wallet nonces colliding.
    const account = await this.prisma.account.findFirst({
      where: { address: multisigAddress.toLowerCase() },
    });
    if (!account) {
      throw new NotFoundException('Multisig not found');
    }
    if (!isX402SupportedChain(account.chainId)) {
      throw new BadRequestException('Chain not supported by x402');
    }
    return account;
  }

  private async validatePayloadAgainstMultisig(
    payload: X402V1PaymentPayload,
    multisigAddress: string,
    chainId: number,
  ): Promise<void> {
    const auth = payload.payload.authorization;
    const network = chainIdToFacilitatorNetwork(chainId);

    if (payload.network !== network) {
      throw new BadRequestException('Network mismatch with multisig chain');
    }
    if (auth.to.toLowerCase() !== multisigAddress.toLowerCase()) {
      throw new BadRequestException('Authorization "to" does not match path');
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(auth.from)) {
      throw new BadRequestException('Invalid "from" address');
    }

    let value: bigint;
    try {
      value = BigInt(auth.value);
    } catch {
      throw new BadRequestException('Invalid "value"');
    }
    if (value < MIN_DEPOSIT || value > MAX_DEPOSIT) {
      throw new BadRequestException('Amount out of bounds');
    }

    const now = Math.floor(Date.now() / 1000);
    if (Number(auth.validBefore) <= now + AUTH_BUFFER_SECONDS) {
      throw new BadRequestException('Authorization expires too soon');
    }
    if (Number(auth.validAfter) > now) {
      throw new BadRequestException('Authorization not yet valid');
    }

    const sig = payload.payload.signature;
    const r = '0x' + sig.slice(2, 66);
    const s = '0x' + sig.slice(66, 130);
    const v = parseInt(sig.slice(130, 132), 16);

    const domain = this.domainCache.get(chainId);
    const recovered = await recoverEip3009Signer(
      {
        from: auth.from,
        to: auth.to,
        value: auth.value,
        validAfter: Number(auth.validAfter),
        validBefore: Number(auth.validBefore),
        nonce: auth.nonce,
        v,
        r,
        s,
      },
      domain,
    );
    if (recovered.toLowerCase() !== auth.from.toLowerCase()) {
      throw new BadRequestException('Invalid signature');
    }
  }

  private async assertNonceUnused(
    from: string,
    nonce: string,
    chainId: number,
  ): Promise<void> {
    const existing = await this.prisma.x402Deposit.findUnique({
      where: { principalAuthNonce: nonce.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('Nonce already used');
    }
    const chain = getChainById(chainId);
    const usdc = USDC_TOKEN.addresses[chainId] as `0x${string}`;
    const client = createPublicClient({ chain, transport: http() });
    const used = await client.readContract({
      address: usdc,
      abi: USDC_AUTHORIZATION_STATE_ABI,
      functionName: 'authorizationState',
      args: [from as `0x${string}`, nonce as `0x${string}`],
    });
    if (used) {
      throw new BadRequestException('Authorization already consumed on-chain');
    }
  }

  private async assertPerMultisigRateLimit(
    multisigAddress: string,
  ): Promise<void> {
    const since = new Date(Date.now() - PER_MULTISIG_RATE_LIMIT_WINDOW_MS);
    const count = await this.prisma.x402Deposit.count({
      where: {
        multisigAddress: multisigAddress.toLowerCase(),
        createdAt: { gte: since },
      },
    });
    if (count >= PER_MULTISIG_RATE_LIMIT_COUNT) {
      throw new HttpException(
        'Too many deposits to this multisig',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // ---------- facilitator ----------

  private buildPaymentRequirements(
    chainId: number,
    payTo: string,
    resourceUrl: string,
    maxAmountRequired: string,
  ): X402PaymentRequirements {
    const domain = this.domainCache.get(chainId);
    return {
      scheme: 'exact',
      network: chainIdToFacilitatorNetwork(chainId),
      asset: USDC_TOKEN.addresses[chainId],
      payTo,
      maxAmountRequired,
      resource: resourceUrl,
      description:
        `Gasless USDC deposit to PolyPay multisig ${payTo}. Sign EIP-3009 ` +
        `transferWithAuthorization for any amount in [${MIN_DEPOSIT}, ${MAX_DEPOSIT}] ` +
        `(6-decimals USDC).`,
      mimeType: 'application/json',
      maxTimeoutSeconds: 120,
      extra: {
        // EIP-712 domain — facilitator requires these for "exact" scheme on EVM
        // to verify the signature against the asset contract.
        name: domain.name,
        version: domain.version,
        // Application-specific bounds (informational for clients).
        minDeposit: MIN_DEPOSIT.toString(),
        maxDeposit: MAX_DEPOSIT.toString(),
      },
    };
  }

  private facilitatorUrl(action: 'verify' | 'settle'): string {
    const base = this.config
      .get<string>(CONFIG_KEYS.X402_FACILITATOR_URL)
      .replace(/\/$/, '');
    if (base.includes('cdp.coinbase.com')) {
      return base.endsWith('/v2/x402')
        ? `${base}/${action}`
        : `${base}/v2/x402/${action}`;
    }
    return `${base}/${action}`;
  }

  private facilitatorHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.config.get<string>(
      CONFIG_KEYS.X402_FACILITATOR_BEARER_TOKEN,
    );
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  private async facilitatorVerify(
    payload: X402V1PaymentPayload,
    requirements: X402PaymentRequirements,
  ): Promise<void> {
    const resp = await axios.post(
      this.facilitatorUrl('verify'),
      {
        x402Version: 1,
        paymentPayload: payload,
        paymentRequirements: requirements,
      },
      { headers: this.facilitatorHeaders(), validateStatus: () => true },
    );
    if (resp.status >= 400 || !this.isVerifyOk(resp.data)) {
      throw new BadRequestException(
        `Facilitator verify failed: ${JSON.stringify(resp.data ?? resp.status)}`,
      );
    }
  }

  private isVerifyOk(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) return false;
    const d = data as Record<string, unknown>;
    if (d.invalidReason || d.errorReason || d.errorMessage) return false;
    return d.isValid === true || d.valid === true || d.success === true;
  }

  private async facilitatorSettle(
    payload: X402V1PaymentPayload,
    requirements: X402PaymentRequirements,
  ): Promise<string> {
    const resp = await axios.post(
      this.facilitatorUrl('settle'),
      {
        x402Version: 1,
        paymentPayload: payload,
        paymentRequirements: requirements,
      },
      { headers: this.facilitatorHeaders(), validateStatus: () => true },
    );
    const data = resp.data as Record<string, unknown> | undefined;
    if (!data?.success || typeof data.transaction !== 'string') {
      throw new Error(
        `Facilitator settle failed: ${
          (data?.errorMessage as string | undefined) ??
          JSON.stringify(data ?? resp.status)
        }`,
      );
    }
    return data.transaction;
  }

  private shortenError(err: unknown): string {
    if (err instanceof AxiosError) return `axios: ${err.message}`;
    if (err instanceof Error) return err.message.slice(0, 500);
    return String(err).slice(0, 500);
  }
}
