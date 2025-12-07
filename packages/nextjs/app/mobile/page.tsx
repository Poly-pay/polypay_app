"use client";

import Image from "next/image";
import { Button } from "~~/components/ui/button";

// import toast from "react-hot-toast";
// import { ActionButton } from "@/components/Common/ActionButton";

// Social media data
const socialLinks = [
  {
    handle: "@qash_finance",
    link: "https://x.com/qash_finance",
    icon: "/social/twitter.svg",
  },
  // {
  //   handle: "@qash",
  //   link: "https://github.com/q3x",
  //   icon: "/social/github.svg",
  // },
  // {
  //   handle: "@q3xfinance",
  //   link: "https://t.me/q3xfinance",
  //   icon: "/social/telegram.svg",
  // },
];

export default function MobilePage() {
  const handleBackToHome = () => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileDevice = mobileRegex.test(userAgent) || window.innerWidth <= 768;

    if (isMobileDevice) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-5 absolute top-0 left-0 z-99999 bg-[url('/common/bg-main.png')] bg-no-repeat bg-cover">
      <span className="flex flex-row ">
        <Image src="/logo/polypay-icon.svg" alt="Polypay Logo" width={60} height={60} />
        <Image src="/logo/polypay-text.svg" alt="Polypay Text" width={150} height={150} />
      </span>
      <Image src="/common/computer.svg" alt="Mobile Illustration" width={350} height={350} />
      <Image src="/common/available.svg" alt="Availability Illustration" width={300} height={300} />
      <span className="text-[20px] font-bold uppercase w-[400px] text-center">
        For the best experience, please visit this website on a desktop
      </span>
      <Button className="w-[400px] text-white cursor-pointer" onClick={handleBackToHome}>
        Back to home
      </Button>
    </div>
  );
}
