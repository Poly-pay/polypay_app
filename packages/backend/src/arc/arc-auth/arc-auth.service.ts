import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { toHex, verifyMessage } from 'viem';

// In-memory nonce store, keyed by lowercased address. Single-instance staging demo only;
// a multi-instance deployment would move this to Redis/DB. Nonces are one-time use.
@Injectable()
export class ArcAuthService {
  private readonly nonces = new Map<string, string>();

  constructor(private readonly jwt: JwtService) {}

  getNonce(address: string): string {
    const nonce = toHex(randomBytes(16));
    this.nonces.set(address.toLowerCase(), nonce);
    return nonce;
  }

  async login(
    address: string,
    signature: string,
  ): Promise<{ accessToken: string }> {
    const key = address.toLowerCase();
    const nonce = this.nonces.get(key);
    if (!nonce)
      throw new UnauthorizedException('No nonce issued for this address');

    const ok = await verifyMessage({
      address: address as `0x${string}`,
      message: `PolyPay Arc login: ${nonce}`,
      signature: signature as `0x${string}`,
    });
    if (!ok) throw new UnauthorizedException('Invalid signature');

    this.nonces.delete(key); // one-time use
    const accessToken = this.jwt.sign({ sub: key, chainType: 'ecdsa' });
    return { accessToken };
  }
}
