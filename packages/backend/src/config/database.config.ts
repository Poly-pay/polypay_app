import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS) || 30000,
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
  databaseUrl: process.env.DATABASE_URL,
}));
