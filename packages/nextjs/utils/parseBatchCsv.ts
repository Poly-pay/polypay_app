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

const HEADER_PATTERN = /^address,amount,token$/i;

export function parseBatchCsv(csvText: string, chainId: number): ParseBatchCsvResult {
  // Strip BOM
  const cleaned = csvText.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r\n|\r|\n/).filter(line => line.trim() !== "");

  if (lines.length === 0) {
    return { validEntries: [], invalidCount: 0 };
  }

  let startIndex = 0;
  if (HEADER_PATTERN.test(lines[0].trim())) {
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

  return { validEntries, invalidCount };
}
