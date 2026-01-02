/**
 * Jest global setup for E2E tests
 * This file runs before all tests
 */

// Increase timeout for blockchain calls
jest.setTimeout(300000);

// Load environment variables from .env.test if exists
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'RELAYER_WALLET_KEY',
  'RELAYER_ZKVERIFY_API_KEY',
  'TEST_SIGNER_A_KEY',
  'TEST_SIGNER_B_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Warning: ${envVar} is not set`);
  }
}

console.log('Jest setup complete');
