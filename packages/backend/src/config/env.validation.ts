import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Database - optional with default
  DATABASE_URL: Joi.string().default(
    'postgresql://polypay_user:polypay_password@localhost:5433/polypay_multisig_db',
  ),

  // JWT - optional with default
  JWT_SECRET: Joi.string().default('default-jwt-secret-change-in-production'),
  JWT_REFRESH_SECRET: Joi.string().default('default-jwt-refresh-secret-change-in-production'),

  // Application - optional with default
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  BACKEND_PORT: Joi.number().default(4000),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  API_PREFIX: Joi.string().default('api'),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),

  // Relayer - REQUIRED, no default
  RELAYER_ZKVERIFY_API_KEY: Joi.string().required().messages({
    'string.empty': 'RELAYER_ZKVERIFY_API_KEY is required',
    'any.required': 'RELAYER_ZKVERIFY_API_KEY is required',
  }),
  RELAYER_WALLET_KEY: Joi.string().required().messages({
    'string.empty': 'RELAYER_WALLET_KEY is required',
    'any.required': 'RELAYER_WALLET_KEY is required',
  }),
});
