// Centralized feature flag readers. Keep one source of truth so we don't
// scatter `process.env.NEXT_PUBLIC_*` checks across the codebase.
export const STEALTH_ENABLED = process.env.NEXT_PUBLIC_FEATURE_STEALTH === "true";

export const X402_DEPOSIT_ENABLED = process.env.NEXT_PUBLIC_FEATURE_X402_DEPOSIT === "true";
