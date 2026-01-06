"use client";

import React, { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import AccountSidebar from "./AccountSidebar";
import { useModalApp } from "~~/hooks/app/useModalApp";
import { ModalName } from "~~/types/modal";

export const ACCOUNT_SIDEBAR_OFFSET = 285;
export const NEW_SUB_ACCOUNT_SIDEBAR_OFFSET = 567;

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
    ],
  },
  {
    label: "Payments",
    description: "Move assets your way – fast, private.",
    menuItems: [
      { icon: "/sidebar/transfer.svg", label: "transfer", link: SIDEBAR_LINKS.TRANSFER },
      { icon: "/sidebar/batch.svg", label: "batch", link: SIDEBAR_LINKS.BATCH },
    ],
  },
];

const SectionItem = ({
  label,
  menuItems,
  showDivider,
  selectedItem,
  openModal,
}: {
  walletAddress?: string;
  label: string;
  menuItems: { icon: string; label: string; transactionsCount?: number; link: string }[];
  showDivider?: boolean;
  selectedItem: string | null;
  onItemClick: (itemLabel: string) => void;
  openModal: (name: ModalName, props?: Record<string, any>) => void;
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const itemComponent = (item: any) => {
    const isDevelopingFeature = ["swap", "ai assistant"].includes(item.label);

    return (
      <div
        key={item.label}
        className={`group flex flex-row items-center gap-3 px-2 py-2 rounded-[12px] cursor-pointer justify-between capitalize ${
          selectedItem === item.link || pathname === item.link
            ? "bg-white text-black font-semibold"
            : "hover:bg-white hover:text-black"
        }`}
        onClick={() => {
          if (isDevelopingFeature) {
            openModal("developingFeature");
            return;
          }
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
      <div className="flex flex-col gap-0.5">{menuItems.map(item => itemComponent(item))}</div>
      {showDivider && <div className="w-full h-[1px] my-1 bg-gray-300" />}
    </div>
  );
};

export default function Sidebar() {
  const { openModal } = useModalApp();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const router = useRouter();

  const handleItemClick = (itemLabel: string) => {
    setSelectedItem(itemLabel);
  };

  return (
    <div className="bg-background relative rounded-lg h-screen min-w-[300px] max-w-[310px] justify-between flex flex-col z-30 border border-[#EDEDED] py-1">
      <div className="p-3">
        {/* Header */}
        <div className="flex flex-row items-center gap-3" onClick={() => router.push("/")}>
          <Image src="/logo/polypay-icon.svg" alt="logo" className="w-8 h-8 cursor-pointer" width={32} height={32} />
          <Image src="/logo/polypay-text.svg" alt="logo" className="cursor-pointer" width={68} height={68} />
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
              openModal={openModal}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-1">
        <AccountSidebar />
      </div>
    </div>
  );
}
