/** Minimum deposit per request: 1 USDC (6 decimals). */
export const MIN_DEPOSIT: bigint = 1_000_000n;

/** Maximum deposit per request: 10,000 USDC (6 decimals). */
export const MAX_DEPOSIT: bigint = 10_000_000_000n;

/** Authorization must remain valid at least this long when we receive it. */
export const AUTH_BUFFER_SECONDS = 60;

/** Per-multisig: max deposits in a 60s window. */
export const PER_MULTISIG_RATE_LIMIT_COUNT = 30;
export const PER_MULTISIG_RATE_LIMIT_WINDOW_MS = 60_000;
