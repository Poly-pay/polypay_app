import Image from "next/image";
import { useDisconnect } from "wagmi";

export const WrongNetwork = () => {
  const { disconnect } = useDisconnect();

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Warning box */}
      <div className="xl:w-full xl:h-[60px] xl:px-4 xl:py-3 bg-[rgba(255,97,0,0.12)] rounded-lg flex items-center gap-2.5">
        <Image
          src="/icons/misc/globe-orange.svg"
          alt="Wrong Network"
          width={20}
          height={20}
          className="xl:block hidden flex-shrink-0"
        />
        <span className="xl:block hidden text-[12px] font-medium text-[#FF7823]">
          You&apos;re on the wrong network. Please disconnect and log in again.
        </span>
      </div>

      {/* Disconnect button */}
      <button
        onClick={() => disconnect()}
        className="w-full h-[28px] px-3 py-2 bg-red-500 rounded-lg flex items-center justify-center gap-2"
      >
        <Image src="/icons/misc/disconnect.svg" alt="Disconnect" width={16} height={16} />
        <span className="xl:block hidden text-[14px] font-medium leading-[20px] tracking-[-0.04em] text-white">
          Disconnect
        </span>
      </button>
    </div>
  );
};
