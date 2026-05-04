export const CONFIG_KEYS = {
  // App
  APP_PORT: 'app.port',
  APP_NODE_ENV: 'app.nodeEnv',
  APP_CORS_ORIGIN: 'app.corsOrigin',
  APP_API_PREFIX: 'app.apiPrefix',
  APP_LOG_LEVEL: 'app.logLevel',
  APP_NETWORK: 'app.network',

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
  REWARD_WALLET_KEY: 'relayer.rewardWalletKey',

  // Telegram
  TELEGRAM_BOT_TOKEN: 'telegram.botToken',
  TELEGRAM_CHAT_ID: 'telegram.chatId',

  // Snag Solutions
  SNAG_API_KEY: 'snag.apiKey',
  SNAG_RULE_ID: 'snag.ruleId',

  // x402 gasless USDC deposit
  X402_ENABLED: 'x402.enabled',
  X402_FACILITATOR_URL: 'x402.facilitatorUrl',
  X402_FACILITATOR_BEARER_TOKEN: 'x402.facilitatorBearerToken',
} as const;
