import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET ||
    'default-jwt-refresh-secret-change-in-production',
  expiresIn: '15m',
  refreshExpiresIn: '7d',
}));
