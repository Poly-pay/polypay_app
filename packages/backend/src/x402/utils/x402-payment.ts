import { BadRequestException } from '@nestjs/common';
import type { X402V1PaymentPayload } from '@polypay/shared';

export function decodeXPaymentHeader(header: string): X402V1PaymentPayload {
  let parsed: unknown;
  try {
    const json = Buffer.from(header.trim(), 'base64').toString('utf8');
    parsed = JSON.parse(json);
  } catch {
    throw new BadRequestException('Malformed X-PAYMENT header');
  }

  if (!isX402V1PaymentPayload(parsed)) {
    throw new BadRequestException(
      'Unsupported X-PAYMENT payload (expected x402 v1)',
    );
  }
  return parsed;
}

function isX402V1PaymentPayload(x: unknown): x is X402V1PaymentPayload {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  if (o.x402Version !== 1 || o.scheme !== 'exact') return false;
  if (typeof o.network !== 'string') return false;
  const inner = o.payload;
  if (typeof inner !== 'object' || inner === null) return false;
  const p = inner as Record<string, unknown>;
  if (typeof p.signature !== 'string') return false;
  const auth = p.authorization;
  if (typeof auth !== 'object' || auth === null) return false;
  const a = auth as Record<string, unknown>;
  return (
    typeof a.from === 'string' &&
    typeof a.to === 'string' &&
    typeof a.value === 'string' &&
    typeof a.validAfter === 'string' &&
    typeof a.validBefore === 'string' &&
    typeof a.nonce === 'string'
  );
}
