"use client";

import Image from "next/image";
import { useAppRouter } from "~~/hooks/app/useRouteApp";

const NAV_BUTTONS = [
  { label: "Dashboard", onClick: "goToDashboard", zIndex: "z-[0]" },
  { label: "Contact Book", onClick: "goToContactBook", zIndex: "z-[1]" },
  { label: "Transfer", onClick: "goToTransfer", zIndex: "z-[3]" },
  { label: "Batch", onClick: "goToBatch", zIndex: "z-[5]" },
] as const;

const AVATAR_IMAGES = [
  { src: "/404/avt-green.svg", width: 70, height: 110, className: "absolute top-0 left-0 z-10" },
  { src: "/404/avt-orange-left.svg", width: 94, height: 127, className: "absolute top-[155px] left-7 z-10" },
  {
    src: "/404/avt-orange-mid.svg",
    width: 94,
    height: 103,
    className: "absolute left-1/2 top-[170px] -translate-x-1/2 -translate-y-1/2 z-10",
  },
  { src: "/404/avt-yellow.svg", width: 65, height: 92, className: "absolute top-[-90px] right-4 z-10" },
  { src: "/404/avt-blue.svg", width: 131, height: 133, className: "absolute top-[155px] right-[-70px] z-10" },
] as const;

const SOCIAL_LINKS = [
  { icon: "/icons/x-icon.svg", alt: "X", handle: "@PolyPay_finance", url: "https://x.com/poly_pay" },
  {
    icon: "/icons/git-icon.svg",
    alt: "GitHub",
    handle: "@PolyPay",
    url: "https://github.com/Poly-pay/polypay_multisig",
  },
  // TODO : fill in telegram's URL
  { icon: "/icons/telegram-icon.svg", alt: "Telegram", handle: "@PolyPay_finance", url: "#" },
] as const;

export default function NotFound() {
  return (
    <>
      <div className="hidden md:block">
        <NotfoundPC />
      </div>
      <div className="block md:hidden">
        <NotfoundMB />
      </div>
    </>
  );
}

export const NotfoundMB = () => {
  const router = useAppRouter();
  return (
    <div
      data-testid="not-found"
      className="bg-[url('/common/bg-main.png')] bg-no-repeat bg-cover absolute w-screen h-screen top-0 left-0 flex flex-col items-center overflow-hidden z-9999"
    >
      <div className="flex w-full p-5 cursor-pointer" onClick={router.goToDashboard}>
        <Image src="/logo/polypay-icon.svg" alt="Polypay Logo" width={60} height={60} />
        /<Image src="/logo/polypay-text.svg" alt="Polypay Text" width={150} height={150} />
      </div>
      <div className="max-w-3xl w-full mx-auto px-4 space-y-5 h-full flex flex-col justify-center">
        <div className="w-full h-[300px] relative">
          <Image src="/404/404.svg" alt="404" width={660} height={273} className="absolute top-0 left-0 z-0" />
          {AVATAR_IMAGES.map(({ src, width, height, className }) => (
            <Image key={src} src={src} alt="404" width={width} height={height} className={className} />
          ))}
        </div>
        <p className="text-4xl font-extrabold italic text-center">PAGE NOT FOUND</p>
        <div>
          {SOCIAL_LINKS.map(({ icon, alt, handle, url }) => (
            <a
              key={alt}
              className="cursor-pointer flex items-center gap-1.5"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image src={icon} alt={alt} width={16} height={16} />
              <span>{handle}</span>
            </a>
          ))}
        </div>
        <div className="grid grid-cols-2 justify-between gap-4 mt-20 pt-3">
          <div className="col-span-1 -mt-3">
            <p className="uppercase text-sm text-main-black font-semibold max-w-36">
              Designed for crypto natives and expert users, our platform offers powerful tools to automate, customize,
              and optimize financial transactions.
            </p>
          </div>
          <div className="col-span-1 flex justify-end">
            <div className="w-40">
              {NAV_BUTTONS.map(({ label, onClick, zIndex }) => (
                <button
                  key={label}
                  type="button"
                  className={`w-full -mt-3 cursor-pointer px-5 py-4 border-1 border-white rounded-[20px] text-sm font-semibold uppercase text-black bg-white/40 ${zIndex === "z-[0]" ? "relative" : "backdrop-blur-sm"} ${zIndex}`}
                  onClick={router[onClick]}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotfoundPC = () => {
  const router = useAppRouter();
  return (
    <div
      data-testid="not-found"
      className="bg-[url('/common/bg-main.png')] bg-no-repeat bg-cover absolute w-screen h-screen top-0 left-0 flex flex-col items-center overflow-hidden z-9999"
    >
      <header className="flex flex-row justify-between items-center top-10 w-full px-20 py-5">
        <div className="flex flex-row cursor-pointer" onClick={router.goToDashboard}>
          <Image src="/logo/polypay-icon.svg" alt="Polypay Logo" width={60} height={60} />
          <Image src="/logo/polypay-text.svg" alt="Polypay Text" width={150} height={150} />
        </div>
        <nav className="flex -space-x-[25px]">
          {NAV_BUTTONS.map(({ label, onClick, zIndex }) => (
            <button
              key={label}
              type="button"
              className={`cursor-pointer px-[32px] py-[16px] border-[2px] border-white w[450px] h[46px] rounded-[20px] font-bold uppercase text-black bg-white/40 ${zIndex === "z-[0]" ? "relative" : "backdrop-blur-sm"} ${zIndex}`}
              onClick={router[onClick]}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <div className="w-screen h-screen relative p-10">
        <div className="absolute left-1/2 top-1/3 transform -translate-x-1/2 -translate-y-1/3">
          <div className="w-[600px] h-[300px] relative">
            <Image src="/404/404.svg" alt="404" width={660} height={273} className="absolute top-0 left-0 z-0" />
            {AVATAR_IMAGES.map(({ src, width, height, className }) => (
              <Image key={src} src={src} alt="404" width={width} height={height} className={className} />
            ))}
          </div>
          <p className="italic font-extrabold text-4xl text-right mt-5">PAGE NOT FOUND</p>
        </div>
        <div className="flex flex-col justify-center h-full mt-16 ml-10">
          <p className="uppercase w-[295px] text-main-black font-semibold">
            Designed for crypto natives and expert users, our platform offers powerful tools to automate, customize, and
            optimize financial transactions.
          </p>
        </div>
        <aside className="absolute right-20 top-1/2 transform -translate-y-1/2 space-y-2 h-[300px]">
          {SOCIAL_LINKS.map(({ icon, alt, handle, url }) => (
            <a
              key={alt}
              className="cursor-pointer flex items-center gap-1.5"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image src={icon} alt={alt} width={16} height={16} />
              <span>{handle}</span>
            </a>
          ))}
        </aside>
      </div>
    </div>
  );
};
