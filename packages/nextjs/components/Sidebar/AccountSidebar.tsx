"use client";

import React from "react";
import Image from "next/image";
import { MultisigConnectButton } from "../scaffold-eth/RainbowKitCustomConnectButton/MultisigConnectButton";
import { Address } from "viem";
import { useDisconnect, useWalletClient } from "wagmi";
import ShinyText from "~~/components/effects/ShinyText";
import { useModalApp } from "~~/hooks/app/useModalApp";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useAccountStore, useIdentityStore } from "~~/services/store";
import { copyToClipboard } from "~~/utils/copy";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-eth";

interface AccountSidebarProps {
  onOpenManageAccounts: () => void;
}

export default function AccountSidebar({ onOpenManageAccounts }: AccountSidebarProps) {
  const appRouter = useAppRouter();
  const { data: walletClient } = useWalletClient();
  const { targetNetwork } = useTargetNetwork();
  const { disconnect } = useDisconnect();

  const { openModal } = useModalApp();
  const { commitment, logout } = useIdentityStore();
  const { clearCurrentAccount, currentAccount } = useAccountStore();

  const handleLogout = () => {
    logout();
    clearCurrentAccount();
    disconnect();
    appRouter.goToDashboardNewAccount();
  };

  // Not connected state
  if (!walletClient?.account) {
    return (
      <div className="p-3 bg-main-white border border-grey-200 rounded-xl">
        <div className="flex flex-col gap-1">
          <Image src="/logo/polypay-icon.svg" width={24} height={24} alt="logo" />
          <span className="font-bold">Welcome to Polypay</span>
          <span className="text-sm">Connect your wallet to power up your journal.</span>
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
        className="flex items-center gap-2 pl-1 pr-3 py-1 bg-pink-25 rounded-xl cursor-pointer hover:bg-pink-75"
        onClick={onOpenManageAccounts}
      >
        {/* Avatar */}
        <div className="w-10 h-10 bg-main-pink rounded-[9px] flex items-center justify-center">
          <Image src="/sidebar/account-icon.svg" alt="Account" width={24} height={24} />
        </div>

        {/* Info */}
        <div className="xl:flex hidden flex-1 flex-col gap-1">
          {/* Name + Address */}
          <div className="flex items-center gap-1.5">
            {/* Name */}
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-main-pink truncate max-w-[60px] tracking-[-0.04em]">
                {currentAccount?.name || "My Account"}
              </span>
            </div>
            {/* Address */}
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-main-black tracking-[-0.04em]">{shortAddress}</span>
              <Image
                src="/sidebar/copy.svg"
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
          </div>
          {/* Signer */} {/* TODO: show signer name of current account*/}
          <div className="flex items-center gap-1">
            <Image src="/sidebar/signer-icon.svg" alt="Signer" width={12} height={12} className="rounded-lg" />
            <span className="text-xs font-normal text-grey-850 tracking-[-0.04em]">Signer name</span>
          </div>
        </div>

        {/* Arrow */}
        <Image src="/sidebar/chevron-right.svg" alt="Expand" width={10} height={10} />
      </div>

      {/* Commitment Section */}
      <div className="xl:flex hidden flex-col gap-[3px]">
        {/* Label */}
        <span className="text-sm font-medium text-grey-400 tracking-[-0.04em]">Commitment</span>

        {/* Commitment Box */}
        <div
          className={`
            h-8 px-2.5 py-1 bg-main-black rounded-lg flex items-center gap-[5px]
            ${!commitment ? "cursor-pointer hover:bg-grey-900" : ""}
          `}
          onClick={() => !commitment && openModal("generateCommitment")}
        >
          {commitment ? (
            <>
              {/* Logo mini */}
              <Image src="/logo/polypay-icon.svg" alt="Polypay" width={9} height={17} />
              {/* Commitment text */}
              <ShinyText
                text={shortCommitment || ""}
                disabled={false}
                speed={3}
                className="flex-1 text-sm font-medium text-main-white tracking-[-0.06em]"
              />
              {/* Copy */}
              <Image
                src="/sidebar/copy-white.svg"
                alt="Copy"
                width={16}
                height={16}
                className="cursor-pointer hover:opacity-80"
                onClick={() => copyToClipboard(commitment || "", "Commitment copied to clipboard")}
              />
            </>
          ) : (
            <span className="flex-1 text-sm font-medium text-main-white text-center tracking-[-0.06em]">
              Generate your commitment
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-start gap-2">
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
