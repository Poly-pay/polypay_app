import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { ArcAuthService } from './arc-auth.service';
import { JwtService } from '@nestjs/jwt';

describe('ArcAuthService', () => {
  const jwt = { sign: (p: any) => `token:${p.sub}` } as unknown as JwtService;
  let service: ArcAuthService;
  beforeEach(() => (service = new ArcAuthService(jwt)));

  it('issues a token keyed by the recovered address when the nonce message is signed', async () => {
    const signer = privateKeyToAccount(generatePrivateKey());
    const nonce = service.getNonce(signer.address);
    const signature = await signer.signMessage({
      message: `PolyPay Arc login: ${nonce}`,
    });
    const res = await service.login(signer.address, signature);
    expect(res.accessToken).toBe(`token:${signer.address.toLowerCase()}`);
  });

  it('rejects a signature from a different signer', async () => {
    const signer = privateKeyToAccount(generatePrivateKey());
    const other = privateKeyToAccount(generatePrivateKey());
    const nonce = service.getNonce(signer.address);
    const signature = await other.signMessage({
      message: `PolyPay Arc login: ${nonce}`,
    });
    await expect(service.login(signer.address, signature)).rejects.toThrow();
  });

  it('rejects reuse of a consumed nonce', async () => {
    const signer = privateKeyToAccount(generatePrivateKey());
    const nonce = service.getNonce(signer.address);
    const signature = await signer.signMessage({
      message: `PolyPay Arc login: ${nonce}`,
    });
    await service.login(signer.address, signature);
    await expect(service.login(signer.address, signature)).rejects.toThrow();
  });
});
