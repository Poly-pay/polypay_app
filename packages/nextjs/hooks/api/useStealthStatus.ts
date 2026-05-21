import { STEALTH_KEY_REGISTRY_ABI, getUmbraAddresses, isStealthSupportedChain } from "@polypay/shared";
import { useQuery } from "@tanstack/react-query";
import { type Address, createPublicClient, http } from "viem";
import { base } from "viem/chains";

// Stealth registry only exists on Base mainnet. We read it directly from
// chain — there's no PolyPay backend involvement in recipient onboarding:
// recipients register via app.umbra.cash and we just observe the result.
const STEALTH_CHAIN_ID = 8453;

// Same RPC override scaffold.config.ts uses — public mainnet.base.org rejects
// browser-origin requests.
const STEALTH_RPC_URL = "https://base-rpc.publicnode.com";

const client = createPublicClient({ chain: base, transport: http(STEALTH_RPC_URL) });

export const stealthKeys = {
  all: ["stealth"] as const,
  status: (walletAddress: string) => [...stealthKeys.all, "status", walletAddress.toLowerCase()] as const,
};

export interface StealthStatus {
  walletAddress: string;
  registered: boolean;
}

async function fetchStealthStatus(walletAddress: string): Promise<StealthStatus> {
  if (!isStealthSupportedChain(STEALTH_CHAIN_ID)) {
    return { walletAddress, registered: false };
  }
  const { registry } = getUmbraAddresses(STEALTH_CHAIN_ID);
  const [, spendingPubKey, , viewingPubKey] = (await client.readContract({
    address: registry as Address,
    abi: STEALTH_KEY_REGISTRY_ABI,
    functionName: "stealthKeys",
    args: [walletAddress as Address],
  })) as readonly [bigint, bigint, bigint, bigint];

  return {
    walletAddress,
    registered: spendingPubKey !== 0n && viewingPubKey !== 0n,
  };
}

export function useStealthStatus(walletAddress: string | undefined | null) {
  const normalized = walletAddress?.toLowerCase() ?? "";

  return useQuery({
    queryKey: stealthKeys.status(normalized),
    queryFn: () => fetchStealthStatus(normalized),
    enabled: !!normalized && /^0x[a-fA-F0-9]{40}$/.test(normalized),
    staleTime: 60_000,
  });
}
