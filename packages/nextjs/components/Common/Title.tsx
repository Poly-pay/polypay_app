"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { PortfolioModal } from "../Modals/PortFolioModal";

const Title: React.FC = () => {
  const pathname = usePathname();
  let title;

  switch (pathname) {
    case "/dashboard":
      title = "Dashboard";
      break;
    case "/dashboard/new-account":
      title = "Create New Account";
      break;
    case "/address-book":
      title = "Address Book";
      break;
    case "/ai-assistant":
      title = "AI Assistant";
      break;
    case "/send":
      title = "Transfer";
      break;
    case "/swap":
      title = "Swap Token";
      break;
    case "/batch":
      title = "Your Batch";
      break;
    case "/transactions":
      title = "Transactions";
      break;
  }

  return (
    <div className="flex flex-row gap-2 pt-2">
      {/* Title */}
      <div className={`flex gap-1.5 items-center justify-start w-full bg-white rounded-[10px]`}>
        <div className="flex gap-[7px] items-center px-3 py-2 rounded-[10px] bg-background min-w-0 flex-1">
          <img src="/dashboard/icon-dashboard.svg" alt="icon" className="w-8 h-8" />
          <div className="text-[17px] text-text-primary uppercase font-bold">{title}</div>
        </div>
      </div>
      {/* Portfolio */}
      <PortfolioModal>
        <div className="flex flex-row gap-2 w-[200px] justify-center items-center bg-white rounded-lg cursor-pointer">
          <img src="/misc/coin-icon.gif" alt="portfolio" className="w-8 h-8" />
          <span className="text-text-primary font-bold">PORTFOLIO</span>
        </div>
      </PortfolioModal>
    </div>
  );
};

export default Title;
