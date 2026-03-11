import { registerAs } from '@nestjs/config';
import { DB_CONNECTION_TIMEOUT } from '@/common/constants/timing';

export default registerAs('database', () => ({
  connectionTimeoutMs:
    parseInt(process.env.DB_CONNECTION_TIMEOUT_MS) || DB_CONNECTION_TIMEOUT,
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
  databaseUrl: process.env.DATABASE_URL,
}));
