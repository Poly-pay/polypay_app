"use client";

import Image from "next/image";
import { useAppRouter } from "~~/hooks/app/useRouteApp";

export const BackButton = () => {
  const { goBack } = useAppRouter();

  return (
    <button
      onClick={goBack}
      className="flex items-center justify-center w-12 h-12 bg-white rounded-[10px] hover:bg-grey-100 transition-colors"
      aria-label="Back to dashboard"
    >
      <Image src="/icons/arrows/arrow-left.svg" alt="Back" width={20} height={20} />
    </button>
  );
};
