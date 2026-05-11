import { registerAs } from '@nestjs/config';

export default registerAs('stealth', () => ({
  enabled: process.env.FEATURE_STEALTH === 'true',
  relayerPrivateKey: process.env.STEALTH_RELAYER_PRIVATE_KEY ?? '',
  rpcUrl: process.env.STEALTH_RPC_URL ?? 'https://mainnet.base.org',
}));
