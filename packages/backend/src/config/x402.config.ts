import { registerAs } from '@nestjs/config';

export default registerAs('x402', () => ({
  enabled: process.env.FEATURE_X402_DEPOSIT === 'true',
  facilitatorUrl:
    process.env.X402_FACILITATOR_URL ?? 'https://facilitator.payai.network',
  facilitatorBearerToken: process.env.X402_FACILITATOR_BEARER_TOKEN ?? '',
}));
