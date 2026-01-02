export const CONFIG_KEYS = {
  // App
  APP_PORT: 'app.port',
  APP_NODE_ENV: 'app.nodeEnv',
  APP_CORS_ORIGIN: 'app.corsOrigin',
  APP_API_PREFIX: 'app.apiPrefix',
  APP_LOG_LEVEL: 'app.logLevel',

  // Database
  DATABASE_URL: 'database.url',

  // JWT
  JWT_SECRET: 'jwt.secret',
  JWT_REFRESH_SECRET: 'jwt.refreshSecret',
  JWT_EXPIRES_IN: 'jwt.expiresIn',
  JWT_REFRESH_EXPIRES_IN: 'jwt.refreshExpiresIn',

  // Relayer
  RELAYER_ZK_VERIFY_API_KEY: 'relayer.zkVerifyApiKey',
  RELAYER_WALLET_KEY: 'relayer.walletKey',
} as const;
