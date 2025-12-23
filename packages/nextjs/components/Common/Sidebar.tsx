"use client";

import React, { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { DevelopingFeatureModal } from "../Modals/DevelopingFeatureModal";
import { GenerateCommitmentModal } from "../Modals/GenerateCommitmentModal";
import { ReceiveModal } from "../Modals/ReceiveModal";
import { Balance } from "../scaffold-eth";
import { MultisigConnectButton } from "../scaffold-eth/RainbowKitCustomConnectButton/MultisigConnectButton";
import { Copy } from "lucide-react";
import { Address } from "viem";
import { useDisconnect, useWalletClient } from "wagmi";
import ShinyText from "~~/components/effects/ShinyText";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useIdentityStore, useWalletStore } from "~~/services/store";
import { getBlockExplorerAddressLink, notification } from "~~/utils/scaffold-eth";

export const ACCOUNT_SIDEBAR_OFFSET = 285; // Main sidebar width
export const NEW_SUB_ACCOUNT_SIDEBAR_OFFSET = 567; // Account sidebar width + gap

const SIDEBAR_LINKS = {
  DASHBOARD: "/dashboard",
  ADDRESS_BOOK: "/address-book",
  AI_ASSISTANT: "/ai-assistant",
  TRANSFER: "/transfer",
  SWAP: "/swap",
  TRANSACTIONS: "/transactions",
  BATCH: "/batch",
  VETKEYS: "/vetkeys",
};

const sectionItems = [
  {
    label: "Quick Access",
    menuItems: [
      { icon: "/sidebar/dashboard.svg", label: "dashboard", link: SIDEBAR_LINKS.DASHBOARD },
      { icon: "/sidebar/address-book.svg", label: "address book", link: SIDEBAR_LINKS.ADDRESS_BOOK },
      // { icon: "/sidebar/ai-assistant.svg", label: "ai assistant", link: SIDEBAR_LINKS.AI_ASSISTANT },
    ],
  },
  {
    label: "Payments",
    description: "Move assets your way – fast, private.",
    menuItems: [
      { icon: "/sidebar/transfer.svg", label: "transfer", link: SIDEBAR_LINKS.TRANSFER },
      // { icon: "/sidebar/swap.svg", label: "swap", link: SIDEBAR_LINKS.SWAP },
      { icon: "/sidebar/batch.svg", label: "batch", link: SIDEBAR_LINKS.BATCH },
    ],
  },
  // {
  //   label: "teams",
  //   description: "Multi-sig? Shared control? It's all here.",
  //   menuItems: [
  //     {
  //       icon: "/sidebar/transaction.svg",
  //       label: "transactions",
  //       transactionsCount: 10,
  //       link: SIDEBAR_LINKS.TRANSACTIONS,
  //     },
  //   ],
  // },
];

const SectionItem = ({
  label,
  menuItems,
  showDivider,
  selectedItem,
}: {
  walletAddress?: string;
  label: string;
  menuItems: { icon: string; label: string; transactionsCount?: number; link: string }[];
  showDivider?: boolean;
  selectedItem: string | null;
  onItemClick: (itemLabel: string) => void;
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const itemComponent = (item: any, notRoute = false) => {
    return (
      <div
        key={item.label}
        className={`group flex flex-row items-center gap-3 px-2 py-2 rounded-[12px] cursor-pointer justify-between capitalize ${
          selectedItem === item.link || pathname === item.link
            ? "bg-white text-black font-semibold"
            : "hover:bg-white hover:text-black"
        }`}
        onClick={() => {
          if (notRoute) return;
          router.push(item.link);
        }}
        onMouseEnter={() => setHoveredItem(item.link)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <div className="flex flex-row items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <Image
              src={item.icon}
              alt={item.label}
              className="scale-125"
              width={32}
              height={32}
              style={{
                filter:
                  selectedItem === item.link || hoveredItem === item.link || pathname === item.link
                    ? "brightness(0) saturate(100%) invert(62%) sepia(85%) saturate(1295%) hue-rotate(288deg) brightness(101%) contrast(104%)"
                    : "none",
              }}
            />
          </div>
          <span
            className={`${
              selectedItem === item.link || pathname === item.link
                ? "font-semibold text-black"
                : "font-normal text-text-primary group-hover:font-semibold group-hover:text-black font-barlow"
            }`}
          >
            {item.label}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col">
        <span className="text-lg text-text-primary text-[#ADADAD]">{label}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {menuItems.map(item => {
          if (["swap", "ai assistant"].includes(item.label)) {
            return <DevelopingFeatureModal key={item.label}>{itemComponent(item, true)}</DevelopingFeatureModal>;
          }
          return itemComponent(item);
        })}
      </div>
      {showDivider && <div className="w-full h-[1px] my-1 bg-gray-300" />}
    </div>
  );
};

export default function Sidebar() {
  const { data: walletClient } = useWalletClient();
  const { targetNetwork } = useTargetNetwork();
  const { disconnect } = useDisconnect();

  const { commitment, clearIdentity } = useIdentityStore();
  const { clearCurrentWallet } = useWalletStore();

  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const router = useRouter();

  const handleItemClick = (itemLabel: string) => {
    setSelectedItem(itemLabel);
  };

  return (
    <>
      <div className="bg-background relative rounded-lg h-screen min-w-[300px] max-w-[310px] justify-between flex flex-col z-30 border border-[#EDEDED] py-1">
        <div className="p-3">
          {/* Header */}
          <div className="flex flex-row items-center gap-3" onClick={() => router.push("/")}>
            <Image src="/logo/polypay-icon.svg" alt="logo" className="w-8 h-8 cursor-pointer" width={32} height={32} />
            <Image
              src="/logo/polypay-text.svg"
              alt="logo"
              className="scale-110 cursor-pointer"
              width={32}
              height={32}
            />
            <div className="flex flex-row items-center justify-center rounded-full px-3 py-1 bg-divider">
              <span className="text-sm font-normal text-[#B5009A] px-3 py-1 bg-[#FF7CEB33] rounded-full">Beta</span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] my-3 bg-gray-300" />

          {/* Menu */}
          <div className="flex flex-col gap-2">
            {sectionItems.map((item, index) => (
              <SectionItem
                key={item.label}
                label={item.label}
                menuItems={item.menuItems}
                showDivider={index < sectionItems.length - 1}
                selectedItem={selectedItem}
                onItemClick={handleItemClick}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 px-1">
          {/* Account */}
          <div className="flex flex-col p-3 pb-6">
            {walletClient?.account ? (
              <span className="flex flex-col gap-1 bg-white px-1 py-2 rounded-lg">
                <span className="flex flex-row justify-between">
                  {/* Left side */}
                  <span className="w-[200px] h-full flex flex-col justify-between">
                    <span className="flex flex-row bg-[#F6F3FF] rounded-lg p-1 gap-2">
                      <Image src="/sidebar/avatar.svg" width={70} height={70} alt="Avatar" />
                      <span className="flex flex-col w-full justify-between">
                        <Balance
                          address={walletClient?.account?.address as Address}
                          className="min-h-0 h-auto text-[14px]"
                        />
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
                          <GenerateCommitmentModal>
                            <span>Generate your commitment</span>
                          </GenerateCommitmentModal>
                        )}
                      </span>
                    </span>
                  </span>
                  {/* Right side */}
                  <span className="flex flex-col gap-2">
                    <ReceiveModal address={walletClient?.account?.address as Address}>
                      <Image
                        src="/sidebar/qrcode.svg"
                        width={36}
                        height={36}
                        alt="Qr Code"
                        className="cursor-pointer"
                      />
                    </ReceiveModal>
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
                        // Clear commitment and secret on disconnect
                        clearIdentity();
                        clearCurrentWallet();
                        disconnect();
                      }}
                    />
                  </span>
                </span>
              </span>
            ) : (
              <span className="flex flex-col gap-1 bg-white p-3 rounded-lg">
                <Image src="/logo/polypay-icon.svg" width={24} height={24} alt="logo" />
                <span className="font-bold">Welcome to Polypay</span>
                <span className="text-[14px]">Connect your wallet to power up your journal.</span>
                <MultisigConnectButton />
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
