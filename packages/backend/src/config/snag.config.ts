import { registerAs } from '@nestjs/config';

export default registerAs('snag', () => ({
  apiKey: process.env.SNAG_API_KEY,
  ruleId: process.env.SNAG_RULE_ID,
}));
