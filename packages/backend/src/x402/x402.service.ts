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

// Which facilitator (and thus which bazaar) a request is routed through.
// PayAI is the default path used by the UI and docs (x402 protocol v1).
// CDP is the bazaar-only path that lets Coinbase agentic.market index us
// (x402 protocol v2 — v1 entries stopped being indexed by CDP indexer).
export const Facilitator = {
  PayAI: 'payai',
  CDP: 'cdp',
} as const;
export type Facilitator = (typeof Facilitator)[keyof typeof Facilitator];

// --- x402 v2 wire types -----------------------------------------------------
// Mirrors @x402/core/types/payments.ts. Inlined so we don't pull the package
// just for type names. CDP requires v2 wire format for bazaar indexing today.

interface V2ResourceInfo {
  url: string;
  description?: string;
  mimeType?: string;
}

interface V2PaymentRequirements {
  scheme: 'exact';
  network: string; // CAIP-2 e.g. "eip155:8453"
  asset: string;
  amount: string; // v2 renames v1's maxAmountRequired -> amount
  payTo: string;
  maxTimeoutSeconds: number;
  extra: Record<string, unknown>;
}

interface V2PaymentRequired {
  x402Version: 2;
  resource: V2ResourceInfo;
  accepts: V2PaymentRequirements[];
  extensions?: Record<string, unknown>;
}

interface V2PaymentPayload {
  x402Version: 2;
  resource?: V2ResourceInfo;
  accepted: V2PaymentRequirements;
  payload: {
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
    signature: string;
  };
  extensions?: Record<string, unknown>;
}

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
    facilitator: Facilitator = Facilitator.PayAI,
  ): Promise<X402DiscoveryResponse | V2PaymentRequired> {
    if (facilitator === Facilitator.CDP) {
      this.assertCdpEnabled();
      const account = await this.assertAccount(multisigAddress);
      return this.buildV2PaymentRequired(
        account.chainId,
        account.address,
        resourceUrl,
        MAX_DEPOSIT.toString(),
      );
    }
    const account = await this.assertAccount(multisigAddress);
    const requirements = this.buildPaymentRequirements(
      account.chainId,
      account.address,
      resourceUrl,
      MAX_DEPOSIT.toString(),
      facilitator,
    );
    return { accepts: [requirements] };
  }

  async processDeposit(
    multisigAddress: string,
    paymentHeader: string | undefined,
    memo: string | undefined,
    resourceUrl: string,
    facilitator: Facilitator = Facilitator.PayAI,
  ): Promise<X402DepositResponse> {
    if (facilitator === Facilitator.CDP) this.assertCdpEnabled();
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
    const signedAmount = payload.payload.authorization.value;
    const requirements = this.buildPaymentRequirements(
      account.chainId,
      account.address,
      resourceUrl,
      signedAmount,
      facilitator,
    );

    try {
      if (facilitator === Facilitator.CDP) {
        // CDP requires x402 v2 wire format for bazaar indexing. Translate the
        // v1 X-PAYMENT (UI / bootstrap script send v1) into a v2 payload using
        // the same EIP-3009 signature — cryptographic content is identical
        // across versions, only the JSON wrapper changes.
        const v2Requirements = this.buildV2PaymentRequirementsLeaf(
          account.chainId,
          account.address,
          resourceUrl,
          signedAmount,
        );
        const v2Payload: V2PaymentPayload = {
          x402Version: 2,
          resource: { url: resourceUrl },
          accepted: v2Requirements,
          payload: {
            authorization: payload.payload.authorization,
            signature: payload.payload.signature,
          },
          extensions: {},
        };
        await this.cdpVerify(v2Payload, v2Requirements);
        const txHash = await this.cdpSettle(v2Payload, v2Requirements);
        const updated = await this.prisma.x402Deposit.update({
          where: { id: deposit.id },
          data: { status: 'SETTLED', principalTxHash: txHash },
        });
        return {
          principalTxHash: txHash,
          multisigAddress: account.address,
          depositedAmount: signedAmount,
          chainId: account.chainId,
          status: 'SETTLED',
          timestamp: updated.updatedAt.toISOString(),
        };
      }

      await this.facilitatorVerify(payload, requirements, facilitator);
      const txHash = await this.facilitatorSettle(
        payload,
        requirements,
        facilitator,
      );
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

  private assertCdpEnabled(): void {
    if (!this.config.get<boolean>(CONFIG_KEYS.X402_CDP_ENABLED)) {
      throw new BadRequestException(
        'CDP bazaar path not configured (set CDP_API_KEY_ID + CDP_API_KEY_SECRET)',
      );
    }
  }

  private buildPaymentRequirements(
    chainId: number,
    payTo: string,
    resourceUrl: string,
    maxAmountRequired: string,
    facilitator: Facilitator,
  ): X402PaymentRequirements {
    const domain = this.domainCache.get(chainId);
    const base: X402PaymentRequirements = {
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

    // Both PayAI and CDP (under x402 protocol v1) opt into the bazaar catalog
    // via outputSchema.input.discoverable. The `extensions.bazaar` block is
    // v2-only; sending it with x402Version: 1 gets silently dropped by CDP
    // (verified: EXTENSION-RESPONSES returns base64('{}') and merchant lookup
    // stays not_found after a real settle).
    // Shape mirrors what the x402-express middleware emits for a POST
    // endpoint (body fields under input.body, queryParams empty, structured
    // output). Matches the v1 entries CDP is actively indexing today, e.g.
    // x402.browserbase.com/browser/session/create.
    base.outputSchema = {
      input: {
        type: 'http',
        method: 'POST',
        discoverable: true,
        queryParams: {},
        body: {
          memo: {
            type: 'string',
            required: false,
            description: 'Optional memo recorded with the deposit.',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          principalTxHash: { type: 'string' },
          multisigAddress: { type: 'string' },
          depositedAmount: { type: 'string' },
          chainId: { type: 'number' },
          status: { type: 'string' },
          timestamp: { type: 'string' },
        },
      },
    };
    return base;
  }

  // --- x402 v2 builders for CDP path ----------------------------------------
  // CDP indexer stopped picking up v1 (outputSchema) entries — verified
  // empirically by 3 successful v1 settlements that never appeared in
  // /discovery/merchant lookup. All CDP entries indexed today are v2 with
  // extensions.bazaar at the PaymentRequired top level.

  private buildV2PaymentRequirementsLeaf(
    chainId: number,
    payTo: string,
    resourceUrl: string,
    amount: string,
  ): V2PaymentRequirements {
    void resourceUrl; // resource lives on PaymentRequired, not on the leaf in v2
    const domain = this.domainCache.get(chainId);
    return {
      scheme: 'exact',
      network: `eip155:${chainId}`,
      asset: USDC_TOKEN.addresses[chainId],
      amount,
      payTo,
      maxTimeoutSeconds: 120,
      extra: {
        name: domain.name,
        version: domain.version,
        minDeposit: MIN_DEPOSIT.toString(),
        maxDeposit: MAX_DEPOSIT.toString(),
      },
    };
  }

  private buildV2PaymentRequired(
    chainId: number,
    payTo: string,
    resourceUrl: string,
    amount: string,
  ): V2PaymentRequired {
    return {
      x402Version: 2,
      resource: {
        url: resourceUrl,
        description:
          `Gasless USDC deposit to PolyPay multisig ${payTo}. Sign EIP-3009 ` +
          `transferWithAuthorization for any amount in [${MIN_DEPOSIT}, ${MAX_DEPOSIT}] ` +
          `(6-decimals USDC).`,
        mimeType: 'application/json',
      },
      accepts: [
        this.buildV2PaymentRequirementsLeaf(
          chainId,
          payTo,
          resourceUrl,
          amount,
        ),
      ],
      extensions: { bazaar: this.buildCdpBazaarExtension() },
    };
  }

  // Mirrors @x402/extensions/bazaar createBodyDiscoveryExtension(...) output
  // for a POST endpoint with a JSON body. Shape verified byte-equal against
  // the SDK and validateDiscoveryExtension() = true in offline tests.
  private buildCdpBazaarExtension(): Record<string, unknown> {
    const inputBodyExample = { memo: 'optional payment memo' };
    const inputBodySchema = {
      type: 'object',
      properties: {
        memo: {
          type: 'string',
          description: 'Optional memo recorded with the deposit.',
        },
      },
    };
    const outputExample = {
      principalTxHash: '0x...',
      multisigAddress: '0x...',
      depositedAmount: '1000000',
      chainId: 8453,
      status: 'SETTLED',
    };
    return {
      info: {
        input: {
          type: 'http',
          method: 'POST',
          bodyType: 'json',
          body: inputBodyExample,
        },
        output: { type: 'json', example: outputExample },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['POST', 'PUT', 'PATCH'] },
              bodyType: {
                type: 'string',
                enum: ['json', 'form-data', 'text'],
              },
              body: inputBodySchema,
            },
            required: ['type', 'bodyType', 'body'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              example: { type: 'object' },
            },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    };
  }

  private async cdpVerify(
    paymentPayload: V2PaymentPayload,
    paymentRequirements: V2PaymentRequirements,
  ): Promise<void> {
    const resp = await axios.post(
      this.facilitatorUrl('verify', Facilitator.CDP),
      { x402Version: 2, paymentPayload, paymentRequirements },
      {
        headers: await this.facilitatorHeaders(Facilitator.CDP, 'verify'),
        validateStatus: () => true,
      },
    );
    if (resp.status >= 400 || !this.isVerifyOk(resp.data)) {
      throw new BadRequestException(
        `CDP verify failed: ${JSON.stringify(resp.data ?? resp.status)}`,
      );
    }
  }

  private async cdpSettle(
    paymentPayload: V2PaymentPayload,
    paymentRequirements: V2PaymentRequirements,
  ): Promise<string> {
    const resp = await axios.post(
      this.facilitatorUrl('settle', Facilitator.CDP),
      { x402Version: 2, paymentPayload, paymentRequirements },
      {
        headers: await this.facilitatorHeaders(Facilitator.CDP, 'settle'),
        validateStatus: () => true,
      },
    );
    const extResp =
      resp.headers['extension-responses'] ??
      resp.headers['EXTENSION-RESPONSES'];
    this.logger.warn(
      `[cdp ext-resp v2] ${JSON.stringify(extResp ?? 'missing')}`,
    );
    const data = resp.data as Record<string, unknown> | undefined;
    if (!data?.success || typeof data.transaction !== 'string') {
      throw new Error(
        `CDP settle failed: ${
          (data?.errorMessage as string | undefined) ??
          (data?.errorReason as string | undefined) ??
          JSON.stringify(data ?? resp.status)
        }`,
      );
    }
    return data.transaction;
  }

  private facilitatorBaseUrl(facilitator: Facilitator): string {
    const key =
      facilitator === Facilitator.CDP
        ? CONFIG_KEYS.X402_CDP_FACILITATOR_URL
        : CONFIG_KEYS.X402_FACILITATOR_URL;
    return (this.config.get<string>(key) ?? '').replace(/\/$/, '');
  }

  private facilitatorUrl(
    action: 'verify' | 'settle',
    facilitator: Facilitator,
  ): string {
    const base = this.facilitatorBaseUrl(facilitator);
    if (facilitator === Facilitator.CDP) {
      return base.endsWith('/v2/x402')
        ? `${base}/${action}`
        : `${base}/v2/x402/${action}`;
    }
    return `${base}/${action}`;
  }

  private async facilitatorHeaders(
    facilitator: Facilitator,
    action: 'verify' | 'settle',
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (facilitator === Facilitator.CDP) {
      // CDP uses Ed25519 JWT signed per-request (2 min TTL). The SDK helper
      // computes the kid/sub/aud/uri claims correctly from the host + path.
      const { createAuthHeader } = await import('@coinbase/x402');
      const keyId = this.config.get<string>(CONFIG_KEYS.X402_CDP_API_KEY_ID);
      const keySecret = this.config.get<string>(
        CONFIG_KEYS.X402_CDP_API_KEY_SECRET,
      );
      const url = new URL(this.facilitatorUrl(action, Facilitator.CDP));
      headers.Authorization = await createAuthHeader(
        keyId,
        keySecret,
        'POST',
        url.host,
        url.pathname,
      );
      return headers;
    }

    const token = this.config.get<string>(
      CONFIG_KEYS.X402_FACILITATOR_BEARER_TOKEN,
    );
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  // v1 verify/settle — used for the PayAI path. CDP goes through cdpVerify /
  // cdpSettle with v2 wire format because CDP indexer no longer accepts v1.
  private async facilitatorVerify(
    payload: X402V1PaymentPayload,
    requirements: X402PaymentRequirements,
    facilitator: Facilitator,
  ): Promise<void> {
    const resp = await axios.post(
      this.facilitatorUrl('verify', facilitator),
      {
        x402Version: 1,
        paymentPayload: payload,
        paymentRequirements: requirements,
      },
      {
        headers: await this.facilitatorHeaders(facilitator, 'verify'),
        validateStatus: () => true,
      },
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
    facilitator: Facilitator,
  ): Promise<string> {
    const resp = await axios.post(
      this.facilitatorUrl('settle', facilitator),
      {
        x402Version: 1,
        paymentPayload: payload,
        paymentRequirements: requirements,
      },
      {
        headers: await this.facilitatorHeaders(facilitator, 'settle'),
        validateStatus: () => true,
      },
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
