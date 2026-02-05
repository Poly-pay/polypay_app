"use client";

import React, { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import AccountSidebar from "./AccountSidebar";
import ManageAccountsSidebar from "./ManageAccountsSidebar";
import Routes from "~~/configs/routes.config";
import { useMyAccounts } from "~~/hooks";
import { useModalApp } from "~~/hooks/app/useModalApp";
import { useAppRouter } from "~~/hooks/app/useRouteApp";
import { useAccountStore, useIdentityStore, useSidebarStore } from "~~/services/store";
import { ModalName } from "~~/types/modal";
import { notification } from "~~/utils/scaffold-eth";

const sectionItems = [
  {
    label: "Quick Access",
    requireAccount: true,
    menuItems: [
      { icon: Routes.DASHBOARD.icon, label: Routes.DASHBOARD.title, link: Routes.DASHBOARD.path },
      { icon: Routes.CONTACT_BOOK.icon, label: Routes.CONTACT_BOOK.title, link: Routes.CONTACT_BOOK.path },
    ],
  },
  {
    label: "Payments",
    requireAccount: true,
    menuItems: [
      { icon: Routes.TRANSFER.icon, label: Routes.TRANSFER.title, link: Routes.TRANSFER.path },
      { icon: Routes.BATCH.icon, label: Routes.BATCH.title, link: Routes.BATCH.path },
    ],
  },
  {
    label: "Quest",
    requireAccount: false,
    menuItems: [
      { icon: Routes.QUEST.icon, label: Routes.QUEST.title, link: Routes.QUEST.path },
      { icon: Routes.LEADERBOARD.icon, label: Routes.LEADERBOARD.title, link: Routes.LEADERBOARD.path },
    ],
  },
];

const SectionItem = ({
  label,
  menuItems,
  showDivider,
  openModal,
  requireAccount = true,
  hasAccount = false,
  hasCommitment = false,
}: {
  label: string;
  menuItems: { icon: string; label: string; link: string }[];
  showDivider?: boolean;
  openModal: (name: ModalName, props?: Record<string, any>) => void;
  requireAccount?: boolean;
  hasAccount?: boolean;
  hasCommitment?: boolean;
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Determine if this section is disabled
  // - If requireAccount: need commitment + account
  // - If !requireAccount: only need commitment
  const isSectionDisabled = !hasCommitment || (requireAccount && !hasAccount);

  const handleItemClick = (item: { icon: string; label: string; link: string }) => {
    const isDevelopingFeature = ["swap", "ai assistant"].includes(item.label.toLowerCase());

    // Check if section is disabled and show appropriate notification
    if (isSectionDisabled) {
      if (!hasCommitment) {
        notification.info("Please sign in to continue");
      } else if (requireAccount && !hasAccount) {
        notification.info("Please create an account to access this feature");
      }
      return;
    }

    if (isDevelopingFeature) {
      openModal("developingFeature");
      return;
    }

    router.push(item.link);
  };

  const itemComponent = (item: { icon: string; label: string; link: string }) => {
    const isActive = pathname === item.link;
    const isHovered = hoveredItem === item.link;

    return (
      <div
        key={item.label}
        className={`
          flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl
          ${isSectionDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${isActive ? "bg-main-white border-b border-grey-500" : ""}
          ${!isActive && isHovered && !isSectionDisabled ? "bg-main-white/50" : ""}
        `}
        onClick={() => handleItemClick(item)}
        onMouseEnter={() => !isSectionDisabled && setHoveredItem(item.link)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <div className="flex items-center gap-2">
          {/* Icon */}
          <div className="w-6 h-6 flex items-center justify-center">
            <Image
              src={item.icon}
              alt={item.label}
              width={24}
              height={24}
              style={{
                filter:
                  isActive || (isHovered && !isSectionDisabled)
                    ? "brightness(0) saturate(100%) invert(62%) sepia(85%) saturate(1295%) hue-rotate(288deg) brightness(101%) contrast(104%)"
                    : "none",
              }}
            />
          </div>
          {/* Label */}
          <span
            className={`
              xl:block hidden text-sm capitalize
              ${isActive ? "font-semibold text-grey-950" : "font-medium text-grey-950"}
            `}
          >
            {item.label}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Section Label */}
      <div className="flex flex-col gap-[3px]">
        <span className="xl:block hidden text-sm font-medium text-grey-400 tracking-[-0.03em]">{label}</span>
      </div>
      {/* Menu Items */}
      <div className="flex flex-col gap-1">{menuItems.map(item => itemComponent(item))}</div>
      {/* Divider */}
      {showDivider && <div className="w-full h-0 border-t-[0.5px] border-grey-200" />}
    </div>
  );
};

export default function Sidebar() {
  const { openModal } = useModalApp();
  const router = useAppRouter();
  const { data: accounts = [], isLoading: isLoadingAccounts } = useMyAccounts();
  const { commitment } = useIdentityStore();
  const { currentAccount, setCurrentAccount } = useAccountStore();
  const { isManageAccountsOpen, openManageAccounts, closeManageAccounts } = useSidebarStore();

  // Manage Accounts Sidebar state
  const selectedAccountId = currentAccount?.id || accounts[0]?.id || "";

  const handleLogoClick = () => {
    if (!commitment) {
      notification.info("Please sign in to continue");
      return;
    }
    if (accounts.length === 0) {
      notification.info("Please create an account to continue");
      router.goToDashboardNewAccount();
      return;
    }
    router.goToDashboard();
  };

  const handleOpenManageAccounts = () => {
    openManageAccounts();
  };

  const handleCloseManageAccounts = () => {
    closeManageAccounts();
  };

  const handleSelectAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      setCurrentAccount(account);
    }
    handleCloseManageAccounts();
  };

  const handleCreateAccount = () => {
    router.goToDashboardNewAccount();
    handleCloseManageAccounts();
  };

  return (
    <div className="relative h-full">
      {/* Main Sidebar */}
      <div className="xl:w-[272px] w-[68px] h-full bg-grey-100 border border-grey-100 rounded-lg flex flex-col justify-between p-3">
        {/* Top Section */}
        <div className="flex flex-col">
          {/* Header - Logo */}
          <div
            className="flex items-center gap-[11px] py-[1px] cursor-pointer"
            onClick={handleLogoClick}
          >
            {/* Logo */}
            <div className="flex items-center gap-[4.85px]">
              <Image src="/logo/polypay-icon.svg" alt="logo" width={32} height={28} />
              <Image src="/logo/polypay-text.svg" alt="logo" className="xl:block hidden" width={68} height={16} />
            </div>
            {/* Beta Badge */}
            <div className="xl:flex hidden items-center px-2.5 py-[5px] bg-pink-350/20 rounded-3xl">
              <span className="text-xs font-medium text-main-magenta">Beta</span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-0 border-t border-grey-200 my-3" />

          {/* Menu Sections */}
          <div className="flex flex-col gap-3">
            {sectionItems.map((item, index) => (
              <SectionItem
                key={item.label}
                label={item.label}
                menuItems={item.menuItems}
                showDivider={index < sectionItems.length - 1}
                openModal={openModal}
                requireAccount={item.requireAccount}
                hasAccount={accounts.length > 0}
                hasCommitment={!!commitment}
              />
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col gap-2.5">
          {/* Request new feature */}
          {commitment && (
            <div
              className="h-[36px] flex items-center gap-[5px] px-2.5 py-1.5 bg-main-white rounded-lg cursor-pointer hover:bg-grey-50"
              onClick={() => openModal("requestFeature")}
            >
              <Image src="/sidebar/request-feature.svg" alt="Request feature" width={20} height={20} />
              <span className="xl:block hidden flex-1 text-sm font-medium text-grey-700">Request new feature</span>
              <Image
                src="/icons/arrows/arrow-right-purple.svg"
                alt="Arrow"
                width={16}
                height={16}
                className="xl:block hidden"
              />
            </div>
          )}

          {/* Account Sidebar */}
          <AccountSidebar onOpenManageAccounts={handleOpenManageAccounts} />
        </div>
      </div>

      {/* Invisible backdrop for click outside to close */}
      {isManageAccountsOpen && <div className="fixed inset-0 z-40" onClick={handleCloseManageAccounts} />}

      {/* Always render for animation */}
      <ManageAccountsSidebar
        isOpen={isManageAccountsOpen}
        onClose={handleCloseManageAccounts}
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={handleSelectAccount}
        onCreateAccount={handleCreateAccount}
        isLoading={isLoadingAccounts}
      />
    </div>
  );
}
