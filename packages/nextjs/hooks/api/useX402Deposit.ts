import { accountKeys } from "./useAccount";
import { USDC_TOKEN, chainIdToFacilitatorNetwork, isX402SupportedChain } from "@polypay/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { encodeXPaymentHeader, x402Api } from "~~/services/api/x402Api";
import { buildX402V1PaymentPayload, signEip3009Authorization } from "~~/utils/eip3009";
import { notification } from "~~/utils/scaffold-eth/notification";

const USDC_DOMAIN_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "version", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;

export function useX402Deposit() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const chainId = useChainId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { multisigAddress: `0x${string}`; amount: bigint }) => {
      if (!walletClient || !address) {
        throw new Error("Wallet not connected");
      }
      if (!publicClient) {
        throw new Error("RPC client not ready");
      }
      if (!isX402SupportedChain(chainId)) {
        throw new Error("Connect to Base or Base Sepolia to deposit via x402");
      }

      const usdc = USDC_TOKEN.addresses[chainId] as `0x${string}` | undefined;
      if (!usdc) {
        throw new Error(`USDC address missing for chain ${chainId}`);
      }

      const [domainName, domainVersion] = await Promise.all([
        publicClient.readContract({ address: usdc, abi: USDC_DOMAIN_ABI, functionName: "name" }),
        publicClient.readContract({ address: usdc, abi: USDC_DOMAIN_ABI, functionName: "version" }),
      ]);

      const network = chainIdToFacilitatorNetwork(chainId);
      const addr = address as `0x${string}`;

      const auth = await signEip3009Authorization({
        walletClient,
        account: addr,
        usdcContract: usdc,
        chainId,
        from: addr,
        to: params.multisigAddress,
        value: params.amount,
        domainName,
        domainVersion,
      });

      const payload = buildX402V1PaymentPayload(network, auth);
      const header = encodeXPaymentHeader(payload);

      return x402Api.deposit(params.multisigAddress, header);
    },
    onSuccess: (_data, params) => {
      notification.success("Deposit submitted");
      void queryClient.invalidateQueries({
        queryKey: accountKeys.byAddress(params.multisigAddress),
      });
    },
    onError: (err: Error) => {
      notification.error(err.message);
    },
  });
}
