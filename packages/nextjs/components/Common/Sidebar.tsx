import React, { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { DevelopingFeatureModal } from "../Modals/DevelopingFeatureModal";
import { ReceiveModal } from "../Modals/ReceiveModal";
import { Balance } from "../scaffold-eth";
import { MultisigConnectButton } from "../scaffold-eth/RainbowKitCustomConnectButton/MultisigConnectButton";
import { CheckCircleIcon, PlusCircleIcon } from "lucide-react";
import { Address } from "viem";
import { useDisconnect, useWalletClient } from "wagmi";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { createCommitment, createSecret } from "~~/utils/multisig";
import { getBlockExplorerAddressLink, notification } from "~~/utils/scaffold-eth";

export const ACCOUNT_SIDEBAR_OFFSET = 285; // Main sidebar width
export const NEW_SUB_ACCOUNT_SIDEBAR_OFFSET = 567; // Account sidebar width + gap

const SIDEBAR_LINKS = {
  DASHBOARD: "/dashboard",
  ADDRESS_BOOK: "/address-book",
  AI_ASSISTANT: "/ai-assistant",
  SEND: "/send",
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
      { icon: "/sidebar/ai-assistant.svg", label: "ai assistant", link: SIDEBAR_LINKS.AI_ASSISTANT },
    ],
  },
  {
    label: "Payments",
    description: "Move assets your way – fast, private.",
    menuItems: [
      { icon: "/sidebar/send.svg", label: "transfer", link: SIDEBAR_LINKS.SEND },
      { icon: "/sidebar/swap.svg", label: "swap", link: SIDEBAR_LINKS.SWAP },
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
  onItemClick,
}: {
  label: string;
  menuItems: { icon: string; label: string; transactionsCount?: number; link: string }[];
  showDivider?: boolean;
  selectedItem: string | null;
  onItemClick: (itemLabel: string) => void;
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const router = useRouter();

  const itemComponent = (item: any, notRoute = false) => {
    return (
      <div
        key={item.label}
        className={`group flex flex-row items-center gap-3 px-2 py-2 rounded-[12px] cursor-pointer justify-between capitalize ${
          selectedItem === item.link ? "bg-white text-black font-semibold" : "hover:bg-white hover:text-black"
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
            <img
              src={item.icon}
              alt={item.label}
              className="scale-125"
              style={{
                filter:
                  selectedItem === item.link || hoveredItem === item.link
                    ? "brightness(0) saturate(100%) invert(62%) sepia(85%) saturate(1295%) hue-rotate(288deg) brightness(101%) contrast(104%)"
                    : "none",
              }}
            />
          </div>
          <span
            className={`${
              selectedItem === item.link
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
          if (["swap", "batch", "address book", "ai assistant"].includes(item.label)) {
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

  const [generateCommitment, setGenerateCommitment] = useState(localStorage.getItem("commitment") ? true : false);

  const pathname = usePathname();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const router = useRouter();

  const handleItemClick = (itemLabel: string) => {
    setSelectedItem(itemLabel);
  };

  useEffect(() => {
    const path = pathname.split("/")[1];
    setSelectedItem(`/${path}`);
  }, [pathname]);

  return (
    <>
      <div className="bg-background relative rounded-lg h-screen min-w-[300px] max-w-[310px] justify-between flex flex-col z-30 border border-[#EDEDED] py-1">
        <div className="p-3">
          {/* Header */}
          <div className="flex flex-row items-center gap-3" onClick={() => router.push("/")}>
            <img src="/logo/polypay-icon.svg" alt="logo" className="w-8 h-8 cursor-pointer" />
            <img src="/logo/polypay-text.svg" alt="logo" className="scale-110 cursor-pointer" />
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
            {/* {walletClient?.account ? ( */}
            {true ? (
              <span className="flex flex-col gap-1 bg-white p-3 rounded-lg">
                <span className="flex flex-row justify-between ">
                  <span className="flex flex-col gap-2 justify-end">
                    <Image src="/sidebar/avatar.svg" width={40} height={40} alt="Avatar" />
                    <Balance address={walletClient?.account?.address as Address} className="min-h-0 h-auto" />
                    <span className="flex flex-row gap-2">
                      <span className="text-[14px]">
                        {walletClient?.account?.address?.slice(0, 6)}...{walletClient?.account?.address?.slice(-4)}
                      </span>
                      <Image
                        onClick={e => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(walletClient?.account?.address || "");
                          notification.success("Address copied to clipboard");
                        }}
                        width={14}
                        height={14}
                        src="/misc/copy-icon.svg"
                        alt="copy"
                        className="cursor-pointer"
                      />
                    </span>
                    <div
                      className="h-8 btn-sm rounded-xl! flex gap-1 px-3 py-1 cursor-pointer bg-[#FF7CEB] text-white text-[16px] "
                      onClick={async () => {
                        if (!walletClient || generateCommitment) return;

                        const secret = await createSecret(walletClient);
                        const commitment = await createCommitment(secret);
                        localStorage.setItem("secret", secret.toString());
                        localStorage.setItem("commitment", commitment.toString());
                        setGenerateCommitment(true);
                      }}
                    >
                      {generateCommitment ? (
                        <>
                          <CheckCircleIcon className="text-xl font-normal h-6 w-4 ml-2 sm:ml-0" aria-hidden="true" />
                          <span className="whitespace-nowrap ">Generated</span>
                        </>
                      ) : (
                        <>
                          <PlusCircleIcon className="text-xl font-normal h-6 w-4 ml-2 sm:ml-0" aria-hidden="true" />
                          <span className="whitespace-nowrap ">Generate commitment</span>
                        </>
                      )}
                    </div>
                    <div
                      className="h-8 btn-sm rounded-xl! flex gap-3 px-3 py-1 cursor-pointer bg-[#FF7CEB] text-white text-[16px] "
                      onClick={() => {
                        if (generateCommitment) {
                          const commitment = localStorage.getItem("commitment");
                          if (commitment) {
                            navigator.clipboard.writeText(commitment);
                            notification.success("Commitment copied to clipboard");
                          }
                        } else {
                          notification.error("Generate a commitment first");
                          return;
                        }
                      }}
                    >
                      <>
                        <DocumentDuplicateIcon
                          className="text-xl font-normal h-6 w-4 ml-2 sm:ml-0"
                          aria-hidden="true"
                        />
                        <span className="whitespace-nowrap">Copy commitment</span>
                      </>
                    </div>
                  </span>
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
                      onClick={() => disconnect()}
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
