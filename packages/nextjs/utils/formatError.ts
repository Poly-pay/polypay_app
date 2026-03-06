type ErrorLike = {
  shortMessage?: string;
  reason?: string;
  response?: { data?: { message?: string } };
  message?: string;
};

const ERROR_PATTERNS: [RegExp, string | null][] = [
  [/user rejected|user denied|user refused|ACTION_REJECTED/i, "Transaction was cancelled."],
  [/insufficient funds/i, "Insufficient funds for this transaction."],
  [/nonce too (high|low)/i, "Transaction conflict. Please try again."],
  [/gas required exceeds|cannot estimate gas/i, "Transaction failed. Please try again."],
  [/rate.?limit|429/i, "Too many requests. Please wait a moment."],
  [/execution reverted|reverted/i, null],
  [/network|ECONNREFUSED|fetch failed|timeout/i, "Connection failed. Please try again."],
];

export function extractRawErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;

  const err = error as ErrorLike;
  return err?.shortMessage || err?.reason || err?.response?.data?.message || err?.message || String(error);
}

function mapToFriendlyMessage(message: string, fallback?: string): string | null {
  const lower = message.toLowerCase();

  for (const [pattern, friendlyMsg] of ERROR_PATTERNS) {
    if (pattern.test(lower)) {
      return friendlyMsg ?? fallback ?? "Transaction failed. Please try again.";
    }
  }

  return null;
}

export function formatErrorMessage(error: unknown, fallback?: string): string {
  console.error("[Error]", error);

  const rawMessage = extractRawErrorMessage(error);
  return mapToFriendlyMessage(rawMessage, fallback) ?? fallback ?? "Something went wrong. Please try again.";
}
