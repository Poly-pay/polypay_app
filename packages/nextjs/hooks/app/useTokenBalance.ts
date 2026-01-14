import { useBalance, useReadContracts } from "wagmi";
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

export function useTokenBalances(accountAddress: string | undefined) {
  const {
    data: nativeBalance,
    isLoading: isNativeLoading,
    refetch: refetchNative,
  } = useBalance({
    address: accountAddress as `0x${string}`,
    query: {
      enabled: !!accountAddress,
    },
  });

  const erc20Tokens = SUPPORTED_TOKENS.filter(token => token.address !== NATIVE_ETH.address);

  const contracts = erc20Tokens.map(token => ({
    address: token.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf" as const,
    args: accountAddress ? [accountAddress as `0x${string}`] : undefined,
  }));

  const {
    data,
    isLoading: isERC20Loading,
    refetch: refetchERC20,
  } = useReadContracts({
    contracts,
    query: {
      enabled: !!accountAddress,
    },
  });

  // Build balances object
  const balances: Record<string, string> = {};

  if (nativeBalance) {
    balances[NATIVE_ETH.address] = formatTokenAmount(nativeBalance.value.toString(), NATIVE_ETH.decimals);
  } else {
    balances[NATIVE_ETH.address] = "0";
  }

  // Add ERC20 token balances
  erc20Tokens.forEach((token, index) => {
    const result = data?.[index];
    if (result?.status === "success" && result.result !== undefined) {
      balances[token.address] = formatTokenAmount(result.result.toString(), token.decimals);
    } else {
      balances[token.address] = "0";
    }
  });

  const refetch = async () => {
    await Promise.all([refetchNative(), refetchERC20()]);
  };

  return { balances, isLoading: isNativeLoading || isERC20Loading, refetch };
}
