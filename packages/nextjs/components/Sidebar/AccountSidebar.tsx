"use client";

import React from "react";
import Image from "next/image";
import { MultisigConnectButton } from "../scaffold-eth/RainbowKitCustomConnectButton/MultisigConnectButton";
import { useQueryClient } from "@tanstack/react-query";
import { Address } from "viem";
import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import ShinyText from "~~/components/effects/ShinyText";
import { useMyAccounts, userKeys } from "~~/hooks";
import { useModalApp } from "~~/hooks/app/useModalApp";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useAccountStore, useIdentityStore } from "~~/services/store";
import { copyToClipboard } from "~~/utils/copy";
import { formatAddress } from "~~/utils/format";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-eth";

interface AccountSidebarProps {
  onOpenManageAccounts: () => void;
}

export default function AccountSidebar({ onOpenManageAccounts }: AccountSidebarProps) {
  const appRouter = useAppRouter();
  const { data: walletClient } = useWalletClient();
  const { targetNetwork } = useTargetNetwork();
  const { disconnect } = useDisconnect();
  const { connector } = useAccount();
  const queryClient = useQueryClient();

  const { openModal } = useModalApp();
  const { commitment, logout } = useIdentityStore();
  const { clearCurrentAccount, currentAccount } = useAccountStore();
  const { data: accounts } = useMyAccounts();
  const mySigner = currentAccount?.signers.find(s => s.commitment === commitment);

  const hasAccounts = accounts && accounts.length > 0;

  const handleLogout = () => {
    logout();
    clearCurrentAccount();
    disconnect();

    queryClient.removeQueries({ queryKey: userKeys.all });
    appRouter.goToDashboardNewAccount();
  };

  // Not connected state
  if (!walletClient?.account) {
    return (
      <div className="flex justify-center p-3 bg-main-white border border-grey-200 rounded-xl">
        <div className="flex flex-col gap-1">
          <Image src="/logo/polypay-icon.svg" width={24} height={24} alt="logo" />
          <span className="hidden xl:block font-bold">Welcome to Polypay</span>
          <span className="hidden xl:block text-sm">Connect your wallet to power up your journal.</span>
          <MultisigConnectButton />
        </div>
      </div>
    );
  }

  // Format address
  const shortAddress = `${walletClient.account.address.slice(0, 4)}...${walletClient.account.address.slice(-3)}`;
  const shortCommitment = commitment ? `${commitment.slice(0, 4)}...${commitment.slice(-4)}` : null;

  return (
    <div className="p-3 bg-main-white border border-grey-200 rounded-xl flex flex-col gap-1.5">
      {/* Account Info Row */}
      <div
        className={`
          flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl cursor-pointer
          ${hasAccounts ? "bg-pink-25 hover:bg-pink-75" : "bg-violet-25 hover:bg-violet-100"}
        `}
        onClick={onOpenManageAccounts}
      >
        {/* Avatar */}
        <div className={`rounded-[9px] flex items-center justify-center`}>
          {hasAccounts ? (
            <Image src="/sidebar/account-icon.svg" alt="Account" width={40} height={40} />
          ) : (
            <Image src="/avatars/user-avatar-empty-square.svg" alt="Avatar" width={40} height={40} />
          )}
        </div>

        {/* Info */}
        <div className="xl:flex hidden flex-1 flex-col gap-1">
          {hasAccounts ? (
            // Have account - 2 lines
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-main-pink truncate max-w-[60px] tracking-[-0.04em]">
                  {currentAccount?.name || "My Account"}
                </span>
                <span className="text-xs font-medium text-main-black tracking-[-0.04em]">{shortAddress}</span>
                <Image
                  src="/icons/actions/copy-purple.svg"
                  alt="Copy"
                  width={16}
                  height={16}
                  className="opacity-40 cursor-pointer hover:opacity-100"
                  onClick={e => {
                    e.stopPropagation();
                    copyToClipboard(walletClient.account.address, "Address copied to clipboard");
                  }}
                />
              </div>
              <div className="flex items-center gap-1">
                <Image
                  src="/avatars/user-avatar-empty-square.svg"
                  alt="Signer"
                  width={12}
                  height={12}
                  className="rounded-lg"
                />
                <span className="text-xs font-normal text-grey-850 tracking-[-0.04em]">
                  {mySigner ? (mySigner.name ?? formatAddress(mySigner.commitment)) : "Signer name"}
                </span>
              </div>
            </>
          ) : (
            // No account - 1 line only
            <div className="flex items-center gap-1.5">
              {/* Wallet Icon from connector */}
              {connector?.icon && (
                <Image
                  src={connector.icon}
                  alt={connector.name || "Wallet"}
                  width={16}
                  height={16}
                  className="rounded"
                />
              )}
              <span className="text-sm font-medium text-grey-900 tracking-[-0.04em]">{shortAddress}</span>
              <Image
                src="/icons/actions/copy-purple.svg"
                alt="Copy"
                width={16}
                height={16}
                className="opacity-40 cursor-pointer hover:opacity-100"
                onClick={e => {
                  e.stopPropagation();
                  copyToClipboard(walletClient.account.address, "Address copied to clipboard");
                }}
              />
            </div>
          )}
        </div>

        {/* Arrow */}
        <Image src="/icons/arrows/chevron-right-purple.svg" alt="Expand" width={10} height={10} />
      </div>

      {/* Commitment Section */}
      <div className="flex flex-col gap-[3px]">
        {/* Label */}
        <span className="xl:block hidden text-sm font-medium text-grey-400 tracking-[-0.04em]">Commitment</span>

        {/* Commitment Box */}
        <div
          className={`
            h-8 px-2.5 py-1 bg-main-black rounded-lg flex items-center justify-between gap-[5px]
            ${!commitment ? "cursor-pointer hover:bg-grey-900" : ""}
          `}
          onClick={() => !commitment && openModal("generateCommitment")}
        >
          {commitment ? (
            <>
              {/* Logo mini */}
              <span className="xl:flex gap-1 hidden">
                <Image src="/logo/polypay-icon.svg" alt="Polypay" width={9} height={17} />
                {/* Commitment text */}
                <ShinyText
                  text={shortCommitment || ""}
                  disabled={false}
                  speed={3}
                  className="flex-1 text-sm font-medium text-main-white tracking-[-0.06em]"
                />
              </span>
              {/* Copy */}
              <Image
                src="/icons/actions/copy-white.svg"
                alt="Copy"
                width={16}
                height={16}
                className="justify-items-end cursor-pointer hover:opacity-80"
                onClick={() => copyToClipboard(commitment || "", "Commitment copied to clipboard")}
              />
            </>
          ) : (
            <span className="flex-1 xl:block hidden text-sm font-medium text-main-white text-center tracking-[-0.06em]">
              Generate your commitment
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="xl:flex hidden items-start gap-2">
        {/* QR Code */}
        <div
          className="w-8 h-8 bg-grey-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-grey-200"
          onClick={() => openModal("qrAddressReceiver", { address: walletClient.account.address as Address })}
        >
          <Image src="/sidebar/qrcode.svg" alt="QR Code" width={16} height={16} />
        </div>

        {/* External Link */}
        <a
          target="_blank"
          href={getBlockExplorerAddressLink(targetNetwork, walletClient.account.address as Address)}
          rel="noopener noreferrer"
          className="w-8 h-8 bg-grey-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-grey-200"
        >
          <Image src="/sidebar/external.svg" alt="External Link" width={16} height={16} />
        </a>

        {/* Logout */}
        <div
          className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-200"
          onClick={handleLogout}
        >
          <Image src="/sidebar/logout.svg" alt="Logout" width={16} height={16} />
        </div>
      </div>
    </div>
  );
}
