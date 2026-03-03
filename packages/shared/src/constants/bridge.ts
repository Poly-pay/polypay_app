// ─── Cross-chain version gate ───

export const CROSS_CHAIN_MIN_CONTRACT_VERSION = 2;

export function isCrossChainEnabled(contractVersion: number): boolean {
  return contractVersion >= CROSS_CHAIN_MIN_CONTRACT_VERSION;
}

// Chain IDs (mirrored from token.ts for bridge-local use)
const HORIZEN_MAINNET = 26514;
const HORIZEN_TESTNET = 2651420;
const BASE_MAINNET = 8453;
const BASE_SEPOLIA = 84532;

// Mainnet chain pairs
const BASE_CHAINS = [BASE_MAINNET, BASE_SEPOLIA] as const;
const HORIZEN_CHAINS = [HORIZEN_MAINNET, HORIZEN_TESTNET] as const;

export type BridgeMechanism = "OP_STACK" | "LAYERZERO";

// ─── LayerZero Endpoint IDs (NOT chain IDs) ───

export const LZ_ENDPOINT_IDS: Record<number, number> = {
  [BASE_MAINNET]: 30184,
  [BASE_SEPOLIA]: 40245,
  [HORIZEN_MAINNET]: 30399,
  [HORIZEN_TESTNET]: 40435,
};

// ─── OP Stack Bridge (Base only, bridging TO Horizen) ───

export const OP_BRIDGE_ADDRESSES: Record<number, string> = {
  [BASE_MAINNET]: "0xf4a6cc4171fda694439f856d912777aa6ab05369",
  [BASE_SEPOLIA]: "0xc2ce54c609489c44fa46f00b034e53c3cd150eb8",
};

export const OP_BRIDGE_MIN_GAS_LIMIT = 200_000;

// ─── OFT / Adapter addresses per chain per token ───

interface OftContractEntry {
  type: "oft" | "adapter";
  address: string;
}

export const BRIDGE_CONTRACTS: Record<
  string,
  Record<number, OftContractEntry>
> = {
  ZEN: {
    [BASE_MAINNET]: {
      type: "adapter",
      address: "0x57da2D504bf8b83Ef304759d9f2648522D7a9280",
    },
    [HORIZEN_MAINNET]: {
      type: "oft",
      address: "0x57da2D504bf8b83Ef304759d9f2648522D7a9280",
    },
    [BASE_SEPOLIA]: {
      type: "adapter",
      address: "0x2ead4B0beBD8e54F9B7cC1007DF4c44a27b9a339",
    },
    [HORIZEN_TESTNET]: {
      type: "oft",
      address: "0xb06EC4ce262D8dbDc24Fac87479A49A7DC4cFb87",
    },
  },
  USDC: {
    [BASE_MAINNET]: {
      type: "adapter",
      address: "0x27a16dc786820b16e5c9028b75b99f6f604b5d26",
    },
    [HORIZEN_MAINNET]: {
      type: "oft",
      address: "0x3a1293Bdb83bBbDd5Ebf4fAc96605aD2021BbC0f",
    },
    // No testnet OFT contracts for USDC
  },
};

// ─── Chain pairing ───

function getPairedChainId(chainId: number): number | null {
  if (chainId === BASE_MAINNET) return HORIZEN_MAINNET;
  if (chainId === HORIZEN_MAINNET) return BASE_MAINNET;
  if (chainId === BASE_SEPOLIA) return HORIZEN_TESTNET;
  if (chainId === HORIZEN_TESTNET) return BASE_SEPOLIA;
  return null;
}

function isBaseChain(chainId: number): boolean {
  return (BASE_CHAINS as readonly number[]).includes(chainId);
}

function isTestnet(chainId: number): boolean {
  return chainId === BASE_SEPOLIA || chainId === HORIZEN_TESTNET;
}

// ─── Route availability ───

/**
 * Returns chain IDs the user can transfer to for a given source chain + token.
 * Always includes the source chain itself (same-chain transfer).
 */
export function getAvailableDestChains(
  srcChainId: number,
  tokenSymbol: string,
): number[] {
  const paired = getPairedChainId(srcChainId);
  const result = [srcChainId];

  if (!paired) return result;

  if (tokenSymbol === "ETH") {
    // ETH bridge only Base → Horizen (OP Stack). Horizen → Base excluded cause rollups mechanism.
    if (isBaseChain(srcChainId)) {
      result.push(paired);
    }
    return result;
  }

  if (tokenSymbol === "USDC") {
    // USDC OFT only on mainnet
    if (!isTestnet(srcChainId)) {
      result.push(paired);
    }
    return result;
  }

  // ZEN: bidirectional on all environments
  if (tokenSymbol === "ZEN") {
    result.push(paired);
  }

  return result;
}

export function isBridgeAvailable(
  srcChainId: number,
  destChainId: number,
  tokenSymbol: string,
): boolean {
  if (srcChainId === destChainId) return false;
  return getAvailableDestChains(srcChainId, tokenSymbol).includes(destChainId);
}

export function getBridgeMechanism(
  srcChainId: number,
  destChainId: number,
  tokenSymbol: string,
): BridgeMechanism | null {
  if (!isBridgeAvailable(srcChainId, destChainId, tokenSymbol)) return null;

  if (tokenSymbol === "ETH") return "OP_STACK";
  return "LAYERZERO";
}

/**
 * Get the OFT/Adapter contract address for a token on a specific chain.
 */
export function getBridgeContract(
  tokenSymbol: string,
  chainId: number,
): OftContractEntry | null {
  return BRIDGE_CONTRACTS[tokenSymbol]?.[chainId] ?? null;
}
