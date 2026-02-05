"use client";

import Image from "next/image";
import { useModalApp } from "~~/hooks";

export const QuestFloatingButton = () => {
  const { openModal } = useModalApp();

  return (
    <>
      <button
        onClick={() => openModal("questIntro")}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3 cursor-pointer hover:scale-105 transition-transform"
      >
        {/* Circle with gradient background */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(143.74deg, #FFFFFF 56.01%, #FFCFFE 86.26%)",
            border: "2.56px solid #FFFFFF",
            boxShadow: "0px 4px 25px rgba(109, 46, 255, 0.19)",
          }}
        >
          {/* Spinning flower icon */}
          <Image
            src="/icons/misc/rainbow-flower.svg"
            alt="How Points Work"
            width={39}
            height={39}
            style={{ animation: "spin 8s linear infinite" }}
          />
        </div>

        {/* Text */}
        <span
          className="text-xs font-extrabold italic text-main-black tracking-tight capitalize"
          style={{ letterSpacing: "-0.06em" }}
        >
          How Points Work
        </span>
      </button>
    </>
  );
};
