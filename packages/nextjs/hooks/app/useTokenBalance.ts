import { useNetworkTokens } from "./useNetworkTokens";
import { formatTokenAmount } from "@polypay/shared";
import { useBalance, useReadContracts } from "wagmi";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export function useTokenBalances(accountAddress: string | undefined) {
  const { tokens, nativeEth } = useNetworkTokens();

  // Filter out native ETH for ERC20 calls
  const erc20Tokens = tokens.filter(token => token.address !== nativeEth.address);

  const { data: nativeBalance, isLoading: isLoadingNative } = useBalance({
    address: accountAddress as `0x${string}`,
    query: {
      enabled: !!accountAddress,
      staleTime: 0,
      refetchOnMount: "always",
      refetchInterval: 30 * 1000,
    },
  });

  // Fetch ERC20 balances
  const contracts = erc20Tokens.map(token => ({
    address: token.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf" as const,
    args: accountAddress ? [accountAddress as `0x${string}`] : undefined,
  }));

  const {
    data,
    isLoading: isLoadingErc20,
    refetch,
  } = useReadContracts({
    contracts,
    query: {
      enabled: !!accountAddress,
      staleTime: 0,
      refetchOnMount: "always",
      refetchInterval: 30 * 1000,
    },
  });

  // Build balances object
  const balances: Record<string, string> = {};

  // Add native ETH balance
  if (nativeBalance) {
    balances[nativeEth.address] = formatTokenAmount(nativeBalance.value.toString(), nativeEth.decimals);
  } else {
    balances[nativeEth.address] = "0";
  }

  // Add ERC20 balances
  erc20Tokens.forEach((token, index) => {
    const result = data?.[index];
    if (result?.status === "success" && result.result !== undefined) {
      balances[token.address] = formatTokenAmount(result.result.toString(), token.decimals);
    } else {
      balances[token.address] = "0";
    }
  });

  const isLoading = isLoadingNative || isLoadingErc20;

  return { balances, isLoading, refetch };
}
