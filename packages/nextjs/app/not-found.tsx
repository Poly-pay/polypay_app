"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  return (
    <div
      data-testid="not-found"
      className="bg-[url('/common/bg-main.png')] bg-no-repeat bg-cover absolute size-full w-full h-full top-0 left-0 flex flex-col items-center overflow-hidden z-9999"
    >
      <span className="flex flex-row justify-between items-center top-10 w-full px-20 py-5">
        <span
          className="flex flex-row cursor-pointer"
          onClick={() => {
            router.push("/dashboard");
          }}
        >
          <Image src="/logo/polypay-icon.svg" alt="Polypay Logo" width={60} height={60} />
          <Image src="/logo/polypay-text.svg" alt="Polypay Text" width={150} height={150} />
        </span>
        <span className="flex -space-x-[25px]">
          <span
            className="cursor-pointer px-[32px] py-[16px] border-[2px] border-white w[450px] h[46px] rounded-[20px] font-bold uppercase text-black bg-white/40 relative z-[0]"
            onClick={() => {
              router.push("/dashboard");
            }}
          >
            Dashboard
          </span>

          <span className="cursor-pointer px-[32px] py-[16px] border-[2px] border-white w[450px] h[46px] rounded-[20px] font-bold uppercase text-black bg-white/40 backdrop-blur-sm z-[1]">
            Address Book
          </span>

          <span className="cursor-pointer px-[32px] py-[16px] border-[2px] border-white w[450px] h[46px] rounded-[20px] font-bold uppercase text-black bg-white/40 backdrop-blur-sm z-[2]">
            AI Assistant
          </span>

          <span
            className="cursor-pointer px-[32px] py-[16px] border-[2px] border-white w[450px] h[46px] rounded-[20px] font-bold uppercase text-black bg-white/40 backdrop-blur-sm z-[3]"
            onClick={() => {
              router.push("/transfer");
            }}
          >
            Transfer
          </span>

          <span className="cursor-pointer px-[32px] py-[16px] border-[2px] border-white w[450px] h[46px] rounded-[20px] font-bold uppercase text-black bg-white/40 backdrop-blur-sm z-[4]">
            Swap
          </span>

          <span className="cursor-pointer px-[32px] py-[16px] border-[2px] border-white w[450px] h[46px] rounded-[20px] font-bold uppercase text-black bg-white/40 backdrop-blur-sm z-[5]">
            Batch
          </span>
        </span>
      </span>
      <span className="flex flex-row gap-10 py-20 px-20 items-center h-full w-full ">
        <span className="uppercase w-[450px] font-bold text-2xl text-left pt-80">
          Designed for crypto natives and expert users, our platform offers powerful tools to automate, customize, and
          optimize financial transactions.
        </span>
        <span className="relative w-[660px] max-h-[273px] pt-100">
          <Image src="/404/404.svg" alt="404" width={660} height={273} className="absolute top-0 left-0 z-0" />
          <Image src="/404/avt-green.svg" alt="404" width={70} height={110} className="absolute top-0 left-0 z-10" />
          <Image
            src="/404/avt-orange-left.svg"
            alt="404"
            width={94}
            height={127}
            className="absolute top-[155px] left-7 z-10"
          />
          <Image
            src="/404/avt-orange-mid.svg"
            alt="404"
            width={94}
            height={103}
            className="absolute left-1/2 top-[170px] -translate-x-1/2 -translate-y-1/2 z-10"
          />
          <Image
            src="/404/avt-yellow.svg"
            alt="404"
            width={65}
            height={92}
            className="absolute top-[-90px] right-4 z-10"
          />
          <Image
            src="/404/avt-blue.svg"
            alt="404"
            width={131}
            height={133}
            className="absolute top-[155px] right-[-70px] z-10"
          />
        </span>
        <span className="ml-40 cursor-pointer">
          <a href="https://github.com/Poly-pay/polypay_multisig" target="_blank" rel="noopener noreferrer">
            <Image src="/404/github.svg" alt="GitHub" width={200} height={40} />
          </a>
        </span>
      </span>
    </div>
  );
}
