import { registerAs } from '@nestjs/config';

export default registerAs('x402', () => ({
  enabled: process.env.FEATURE_X402_DEPOSIT === 'true',
  facilitatorUrl:
    process.env.X402_FACILITATOR_URL ?? 'https://facilitator.payai.network',
  facilitatorBearerToken: process.env.X402_FACILITATOR_BEARER_TOKEN ?? '',
  // CDP bazaar path enables when an API key id is configured.
  cdpEnabled: !!process.env.CDP_API_KEY_ID,
  cdpFacilitatorUrl:
    process.env.X402_CDP_FACILITATOR_URL ??
    'https://api.cdp.coinbase.com/platform/v2/x402',
  cdpApiKeyId: process.env.CDP_API_KEY_ID ?? '',
  cdpApiKeySecret: process.env.CDP_API_KEY_SECRET ?? '',
}));
