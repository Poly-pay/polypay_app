// API timeouts
export const API_TIMEOUT_DEFAULT = 30_000; // 30s
export const API_TIMEOUT_ZK = 600_000; // 10min - ZK proof gen + verify

// React Query defaults
export const QUERY_STALE_TIME = 5 * 60 * 1000; // 5min
export const QUERY_GC_TIME = 10 * 60 * 1000; // 10min
export const QUERY_RETRY_BASE_DELAY = 1_000; // 1s
export const QUERY_RETRY_MAX_DELAY = 30_000; // 30s
export const MUTATION_RETRY_DELAY = 1_000; // 1s

// Polling / refetch intervals
export const BALANCE_REFETCH_INTERVAL = 30_000; // 30s
export const PRICE_REFETCH_INTERVAL = 5 * 60 * 1000; // 5min
export const RPC_POLLING_INTERVAL = 30_000; // 30s

// UI timing
export const COPY_FEEDBACK_DURATION = 2_000; // 2s
export const WARNING_AUTO_HIDE = 5_000; // 5s
export const ANIMATION_DELAY = 10; // 10ms
export const TIMER_TICK = 1_000; // 1s
