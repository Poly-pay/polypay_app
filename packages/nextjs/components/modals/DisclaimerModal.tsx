"use client";

import React, { useState } from "react";
import Image from "next/image";
import ModalContainer from "./ModalContainer";
import { Button } from "~~/components/ui/button";
import { DecoreCircleIcon } from "~~/icons/DecoreCircleIcon";
import { useDisclaimerStore } from "~~/services/store/disclaimerStore";
import { ModalProps } from "~~/types/modal";

const DisclaimerModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [dontShowFor30Days, setDontShowFor30Days] = useState(false);
  const agreeDisclaimer = useDisclaimerStore(state => state.agreeDisclaimer);

  const handleAgree = () => {
    agreeDisclaimer(dontShowFor30Days);
    onClose();
  };

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      className="w-[500px] p-0"
      isCloseButton={false}
      preventClose={true}
    >
      <div className="flex flex-col items-center bg-white rounded-2xl overflow-hidden border border-grey-200 -mx-1.5 -my-4">
        {/* Header */}
        <div className="flex items-center w-full px-3 py-4 gap-4">
          <DecoreCircleIcon width={36} height={36} color="#FF2323" />
          <span className="font-semibold text-[16px] text-grey-950 uppercase tracking-[-0.03em]">Notice</span>
        </div>

        {/* Illustration */}
        <div className="relative w-[200px] h-[210px] flex items-center justify-center">
          {/* Circle border */}
          <div className="absolute w-[200px] h-[200px] rounded-full border border-grey-100" />
          {/* Cross lines */}
          <div className="absolute w-[1px] h-[200px] bg-grey-100" />
          <div className="absolute w-[200px] h-[1px] bg-grey-100" />
          {/* Image */}
          <Image
            src="/modals/disclaimer-illustration.svg"
            width={147}
            height={158}
            alt="Disclaimer"
            className="relative z-10"
          />
        </div>

        {/* Content */}
        <div className="flex flex-col items-center px-5 gap-2 w-full">
          <h3 className="text-[20px] font-medium text-grey-950 tracking-[-0.03em] text-center leading-[110%]">
            BETA Disclaimer
          </h3>
          <p className="text-[14px] font-normal text-grey-700 tracking-[-0.03em] text-center leading-[110%]">
            Please note that PolyPay is currently in beta and is used entirely at your own risk. We will not be liable
            to you for any damages or losses (including but not limited to loss of funds) arising out of or relating to
            your use of the application.
          </p>
          <p className="text-[14px] font-normal text-grey-700 tracking-[-0.03em] text-center leading-[110%]">
            <span className="text-grey-950 font-medium">By clicking Agree</span>, you confirm that you have read and
            understood this notice.
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-col w-full px-5 pt-4 pb-5 gap-[7px] bg-grey-50 border-t border-grey-200 mt-5">
          {/* Checkbox */}
          <label className="flex items-center gap-[7px] cursor-pointer py-[2px]">
            <input
              type="checkbox"
              checked={dontShowFor30Days}
              onChange={e => setDontShowFor30Days(e.target.checked)}
              className="w-[14px] h-[14px] rounded-[5px] border border-grey-400 bg-grey-200 cursor-pointer accent-main-pink"
            />
            <span className="text-[14px] font-medium text-grey-800 tracking-[-0.03em]">Don&apos;t show it again</span>
          </label>

          {/* Button */}
          <Button
            onClick={handleAgree}
            className="w-full h-9 bg-main-pink hover:bg-main-pink/90 text-grey-1000 text-[14px] font-medium tracking-[-0.04em] rounded-lg cursor-pointer transition-all duration-200"
          >
            I Understand & Agree
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
};

export default DisclaimerModal;
