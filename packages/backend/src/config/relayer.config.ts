import { registerAs } from '@nestjs/config';

export default registerAs('relayer', () => ({
  zkVerifyApiKey: process.env.RELAYER_ZKVERIFY_API_KEY,
  walletKey: process.env.RELAYER_WALLET_KEY,
}));
