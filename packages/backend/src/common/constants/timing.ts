// HTTP timeouts
export const HTTP_TIMEOUT_DEFAULT = 30_000; // 30s
export const HTTP_TIMEOUT_PRICE = 10_000; // 10s

// Cache TTL
export const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5min

// Retry delays
export const RETRY_DELAY_BASE = 1_000; // 1s exponential base
export const ZEN_TRANSFER_RETRY_DELAY = 2_000; // 2s
export const PRICE_CAPTURE_RETRY_DELAY = 5_000; // 5s
export const ZK_POLLING_DELAY = 5_000; // 5s
export const PROOF_AGGREGATION_INTERVAL = 10_000; // 10s
export const CROSS_CHAIN_FINALIZATION_WAIT = 40_000; // 40s

// Retry limits
export const ZK_API_MAX_RETRIES = 3;
export const ZK_FINALIZE_MAX_ATTEMPTS = 30;
export const PROOF_AGGREGATION_MAX_ATTEMPTS = 30;
export const RECEIPT_WAIT_MAX_RETRIES = 5;
export const PRICE_CAPTURE_MAX_RETRIES = 10;
export const ZEN_TRANSFER_MAX_RETRIES = 3;

// TTL
export const NONCE_RESERVATION_TTL = 2 * 60 * 1000; // 2min
export const DB_CONNECTION_TIMEOUT = 30_000; // 30s
