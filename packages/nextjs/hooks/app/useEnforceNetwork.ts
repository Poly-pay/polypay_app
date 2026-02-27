import { useEffect } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";
import { useAccountStore } from "~~/services/store";

const SUPPORTED_CHAIN_IDS = scaffoldConfig.targetNetworks.map(network => network.id) as number[];
const DEFAULT_CHAIN_ID = scaffoldConfig.targetNetworks[0]?.id as number | undefined;

export const useEnforceNetwork = () => {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { currentAccount } = useAccountStore();

  useEffect(() => {
    // Once an account is selected, per-account guards (useNetworkGuard) take over.
    if (currentAccount?.chainId) {
      return;
    }

    if (!chainId || !switchChain || !DEFAULT_CHAIN_ID) {
      return;
    }

    // On onboarding / pre-account screens, make sure wallet is on one of our supported networks.
    if (!SUPPORTED_CHAIN_IDS.includes(chainId)) {
      switchChain({ chainId: DEFAULT_CHAIN_ID });
    }
  }, [chainId, switchChain, currentAccount?.chainId]);

  return typeof chainId === "number" && SUPPORTED_CHAIN_IDS.includes(chainId);
};
