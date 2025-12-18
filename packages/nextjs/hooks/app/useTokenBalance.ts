import { useReadContracts } from "wagmi";
import { NATIVE_ETH, SUPPORTED_TOKENS, formatTokenAmount } from "~~/constants";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export function useTokenBalances(walletAddress: string | undefined) {
  // Filter out native ETH
  const erc20Tokens = SUPPORTED_TOKENS.filter(token => token.address !== NATIVE_ETH.address);

  const contracts = erc20Tokens.map(token => ({
    address: token.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf" as const,
    args: walletAddress ? [walletAddress as `0x${string}`] : undefined,
  }));

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: !!walletAddress,
    },
  });

  // Build balances object
  const balances: Record<string, string> = {};
  erc20Tokens.forEach((token, index) => {
    const result = data?.[index];
    if (result?.status === "success" && result.result !== undefined) {
      balances[token.address] = formatTokenAmount(result.result.toString(), token.decimals);
    } else {
      balances[token.address] = "0";
    }
  });

  return { balances, isLoading, refetch };
}
