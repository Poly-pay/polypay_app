import { getTokenBySymbol } from "@polypay/shared";
import { isAddress } from "viem";

interface ParsedBatchEntry {
  address: string;
  amount: string;
  tokenAddress: string;
}

interface ParseBatchCsvResult {
  validEntries: ParsedBatchEntry[];
  invalidCount: number;
}

export function parseBatchCsv(csvText: string, chainId: number): ParseBatchCsvResult {
  // Strip BOM
  const cleaned = csvText.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r\n|\r|\n/).filter(line => line.trim() !== "");

  if (lines.length === 0) {
    return { validEntries: [], invalidCount: 0 };
  }

  // Skip header row: if the first field is not a valid Ethereum address, treat it as a header
  let startIndex = 0;
  const firstField = lines[0].split(",")[0].trim();
  if (!isAddress(firstField)) {
    startIndex = 1;
  }

  const validEntries: ParsedBatchEntry[] = [];
  let invalidCount = 0;

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(",").map(p => p.trim());
    if (parts.length < 3) {
      invalidCount++;
      continue;
    }

    const [address, amountStr, symbol] = parts;

    if (!isAddress(address)) {
      invalidCount++;
      continue;
    }

    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      invalidCount++;
      continue;
    }

    try {
      const token = getTokenBySymbol(symbol, chainId);
      // Check if the resolved token matches the requested symbol (getTokenBySymbol falls back to native)
      if (token.symbol.toLowerCase() !== symbol.toLowerCase()) {
        invalidCount++;
        continue;
      }
      validEntries.push({ address, amount: amountStr, tokenAddress: token.address });
    } catch {
      invalidCount++;
    }
  }

  // Merge entries with same address + tokenAddress by summing amounts
  const mergeKey = (entry: ParsedBatchEntry) => `${entry.address.toLowerCase()}_${entry.tokenAddress.toLowerCase()}`;
  const mergedMap = new Map<string, ParsedBatchEntry>();

  for (const entry of validEntries) {
    const key = mergeKey(entry);
    const existing = mergedMap.get(key);
    if (existing) {
      // Use toFixed(18) to avoid floating-point precision issues (e.g., 0.1 + 0.2 = 0.30000000000000004)
      const sum = parseFloat(existing.amount) + parseFloat(entry.amount);
      existing.amount = parseFloat(sum.toFixed(18)).toString();
    } else {
      mergedMap.set(key, { ...entry });
    }
  }

  return { validEntries: Array.from(mergedMap.values()), invalidCount };
}
