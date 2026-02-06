"use client";

// @refresh reset
import { ConnectButton } from "@rainbow-me/rainbowkit";

/**
 * Custom Wagmi Connect Button (watch balance + custom design)
 */
export const MultisigConnectButton = () => {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        return (
          <>
            {(() => {
              if (!connected) {
                return (
                  <button className="btn btn-primary btn-sm text-black" onClick={openConnectModal} type="button">
                    <span className="hidden xl:block">Connect Wallet</span>
                  </button>
                );
              }
            })()}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
};
