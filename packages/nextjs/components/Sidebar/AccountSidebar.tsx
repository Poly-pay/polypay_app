"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Balance } from "../scaffold-eth";
import { MultisigConnectButton } from "../scaffold-eth/RainbowKitCustomConnectButton/MultisigConnectButton";
import { Check, Copy, Pencil, X } from "lucide-react";
import { Address } from "viem";
import { useDisconnect, useWalletClient } from "wagmi";
import ShinyText from "~~/components/effects/ShinyText";
import { useMe, useUpdateMe } from "~~/hooks";
import { useModalApp } from "~~/hooks/app/useModalApp";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useIdentityStore, useWalletStore } from "~~/services/store";
import { getBlockExplorerAddressLink, notification } from "~~/utils/scaffold-eth";

export default function AccountSidebar() {
  const { data: walletClient } = useWalletClient();
  const { targetNetwork } = useTargetNetwork();
  const { disconnect } = useDisconnect();

  const { openModal } = useModalApp();
  const { commitment, logout } = useIdentityStore();
  const { clearCurrentWallet } = useWalletStore();

  const { data: me } = useMe();
  const { mutate: updateMe } = useUpdateMe();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const handleStartEdit = () => {
    setNameInput(me?.name || "");
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (nameInput.trim()) {
      updateMe(
        { name: nameInput.trim() },
        {
          onSuccess: () => setIsEditingName(false),
        },
      );
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setNameInput("");
  };

  if (!walletClient?.account) {
    return (
      <div className="flex flex-col p-3 pb-6">
        <span className="flex flex-col gap-1 bg-white p-3 rounded-lg">
          <Image src="/logo/polypay-icon.svg" width={24} height={24} alt="logo" />
          <span className="font-bold">Welcome to Polypay</span>
          <span className="text-[14px]">Connect your wallet to power up your journal.</span>
          <MultisigConnectButton />
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-3 pb-6">
      <span className="flex flex-col gap-1 bg-white px-1 py-2 rounded-lg">
        <span className="flex flex-row justify-between">
          {/* Left side */}
          <span className="w-[200px] h-full flex flex-col justify-between">
            <span className="flex flex-row bg-[#F6F3FF] rounded-lg p-1 gap-2">
              <Image src="/sidebar/avatar.svg" width={70} height={70} alt="Avatar" />
              <span className="flex flex-col w-full justify-between">
                <span className="flex flex-row items-center gap-2">
                  {isEditingName ? (
                    <>
                      <input
                        type="text"
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        className="w-[100%] flex-1 px-2 py-1 text-[14px] border border-gray-300 rounded focus:outline-none focus:border-primary"
                        placeholder="Your name"
                        autoFocus
                      />
                      <Check
                        width={16}
                        height={16}
                        className="cursor-pointer text-green-500"
                        onClick={handleSaveName}
                      />
                      <X width={16} height={16} className="cursor-pointer text-red-500" onClick={handleCancelEdit} />
                    </>
                  ) : (
                    <>
                      <span className="text-[14px] font-medium">{me?.name || "Set your name"}</span>
                      <Pencil
                        width={12}
                        height={12}
                        className="cursor-pointer text-gray-500 hover:text-primary"
                        onClick={handleStartEdit}
                      />
                    </>
                  )}
                </span>
                <Balance address={walletClient?.account?.address as Address} className="min-h-0 h-auto text-[14px]" />
                <span className="flex flex-row items-center gap-2">
                  <Image src="/sidebar/fox.svg" width={14} height={14} alt="Fox" />
                  <span className="text-[12px]">
                    {walletClient?.account?.address?.slice(0, 6)}...{walletClient?.account?.address?.slice(-4)}
                  </span>
                  <Copy
                    onClick={e => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(walletClient?.account?.address || "");
                      notification.success("Address copied to clipboard");
                    }}
                    width={12}
                    height={12}
                    className="cursor-pointer"
                  />
                </span>
              </span>
            </span>
            <span>
              <span>Commitment</span>
              <span
                className={`block bg-[#1E1E1E] p-2 text-white font-semibold text-center text-[14px] rounded-[8px] 
                ${!commitment && "cursor-pointer hover:bg-gray-800"}`}
              >
                {commitment ? (
                  <span className="flex flex-row justify-between items-center">
                    <span className="flex flex-row gap-2">
                      <Image src={`/logo/polypay-icon.svg`} width={10} height={10} alt="Polypay Icon" />
                      <ShinyText
                        text={`${commitment?.slice(0, 6)}...${commitment?.slice(-4)}`}
                        disabled={false}
                        speed={3}
                      />
                    </span>
                    <Copy
                      onClick={e => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(commitment || "");
                        notification.success("Commitment copied to clipboard");
                      }}
                      width={14}
                      height={14}
                      className="cursor-pointer"
                    />
                  </span>
                ) : (
                  <span onClick={() => openModal("generateCommitment")}>Generate your commitment</span>
                )}
              </span>
            </span>
          </span>
          {/* Right side */}
          <span className="flex flex-col gap-2">
            <Image
              src="/sidebar/qrcode.svg"
              width={36}
              height={36}
              alt="Qr Code"
              onClick={() => openModal("qrAddressReceiver", { address: walletClient?.account?.address as Address })}
              className="cursor-pointer"
            />
            <span>
              <a
                target="_blank"
                href={getBlockExplorerAddressLink(targetNetwork, walletClient?.account?.address as Address)}
                rel="noopener noreferrer"
                className="cursor-pointer"
              >
                <Image src="/sidebar/external.svg" width={36} height={36} alt="External Link" />
              </a>
            </span>
            <Image
              src="/sidebar/logout.svg"
              width={36}
              height={36}
              alt="Logout"
              className="cursor-pointer"
              onClick={() => {
                logout();
                clearCurrentWallet();
                disconnect();
              }}
            />
          </span>
        </span>
      </span>
    </div>
  );
}
