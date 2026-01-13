import { useEffect } from "react";
import { useTargetNetwork } from "../scaffold-eth";
import { NATIVE_ETH, SUPPORTED_TOKENS, formatTokenAmount } from "@polypay/shared";
import { useBlockNumber, useReadContracts } from "wagmi";
import { useWatchBalance } from "~~/hooks/scaffold-eth/useWatchBalance";

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
  // Filter out native ETH for ERC20 calls
  const erc20Tokens = SUPPORTED_TOKENS.filter(token => token.address !== NATIVE_ETH.address);

  const { targetNetwork } = useTargetNetwork();
  const { data: blockNumber } = useBlockNumber({ watch: true, chainId: targetNetwork.id });

  // Fetch native ETH balance (auto update on block change)
  const { data: nativeBalance, isLoading: isLoadingNative } = useWatchBalance({
    address: accountAddress as `0x${string}`,
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
    },
  });

  // Build balances object
  const balances: Record<string, string> = {};

  // Add native ETH balance
  if (nativeBalance) {
    balances[NATIVE_ETH.address] = formatTokenAmount(nativeBalance.value.toString(), NATIVE_ETH.decimals);
  } else {
    balances[NATIVE_ETH.address] = "0";
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

  useEffect(() => {
    if (blockNumber && accountAddress) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockNumber]);

  return { balances, isLoading, refetch };
}
