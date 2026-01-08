"use client";

import React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { PortfolioModal } from "../modals/PortFolioModal";
import { useMyAccounts } from "~~/hooks";

const Title: React.FC = () => {
  const pathname = usePathname();
  const { data: accounts } = useMyAccounts();
  const hasMultisigAccount = accounts && accounts.length > 0;
  let title;

  switch (pathname) {
    case "/dashboard":
      title = "Dashboard";
      break;
    case "/dashboard/new-account":
      title = "Create New Account";
      break;
    case "/contact-book":
      title = "Contact Book";
      break;
    case "/transfer":
      title = "Transfer";
      break;
    case "/batch":
      title = "Your Batch";
      break;
  }

  return (
    <div className="flex justify-between gap-1">
      {/* Title */}
      <div className={`flex gap-1.5 items-center justify-start w-full bg-white rounded-[10px]`}>
        <div className="flex gap-[7px] items-center px-3 py-2 rounded-[10px] bg-background min-w-0 flex-1">
          <Image src="/dashboard/icon-dashboard.svg" alt="icon" className="w-8 h-8" width={32} height={32} />
          <div className="text-[17px] text-text-primary uppercase font-bold">{title}</div>
        </div>
      </div>

      {/* Portfolio - Only show if user has multisig account */}
      {hasMultisigAccount && (
        <PortfolioModal>
          <div className="flex flex-row gap-2 w-[200px] justify-center items-center bg-white rounded-lg cursor-pointer">
            <Image src="/misc/coin-icon.gif" alt="portfolio" className="w-8 h-8" width={32} height={32} />
            <span className="text-text-primary font-bold">PORTFOLIO</span>
          </div>
        </PortfolioModal>
      )}

      {/* Notification - We dont need it for now */}
      {/* <NotificationPanel /> */}
    </div>
  );
};

export default Title;
