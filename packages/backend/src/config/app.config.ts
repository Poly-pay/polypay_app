import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.BACKEND_PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  // CORS configuration for frontend
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  // API configuration
  apiPrefix: process.env.API_PREFIX || 'api',
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
}));
