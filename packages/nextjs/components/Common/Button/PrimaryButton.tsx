"use client";

import React from "react";
import Image from "next/image";

export default function PrimaryButton({
  text,
  img,
  onClick,
  className,
}: {
  text: string;
  img?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={` bg-[#FF7CEB] flex items-center justify-center px-5 py-2 rounded-[10px] shadow-[0px_2px_4px_-1px_rgba(12,12,106,0.5),0px_0px_0px_1px_#4470ff] cursor-pointer ${className}`}
      onClick={onClick}
    >
      <span className="font-semibold text-[16px] text-center text-white flex flex-row items-center gap-2">
        {img && (
          <Image
            src={img}
            alt=""
            width={20}
            height={20}
            style={{ filter: "brightness(0) saturate(100%) invert(100%)" }}
          />
        )}{" "}
        {text}
      </span>
    </button>
  );
}
