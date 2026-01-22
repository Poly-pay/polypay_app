"use client";

import React, { useState } from "react";
import Image from "next/image";
import ModalContainer from "./ModalContainer";
import { ShieldAlert } from "lucide-react";
import { Button } from "~~/components/ui/button";
import { useDisclaimerStore } from "~~/services/store";
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
      className="w-[600px] p-0"
      isCloseButton={false}
      preventClose={true}
    >
      <div className="flex flex-col bg-white rounded-lg overflow-hidden -mx-1.5 -my-4">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-grey-200 bg-grey-100">
          <Image src="/icons/misc/icon-modal.svg" width={36} height={36} alt="icon" />
          <span className="font-semibold text-grey-950 uppercase text-lg">Notice</span>
        </div>

        {/* Body */}
        <div className="flex flex-col items-center p-8 text-center bg-grey-100">
          {/* Illustration Icon */}
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-orange-50 mb-6">
            <ShieldAlert className="w-10 h-10 text-orange-500" />
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-grey-1000 uppercase mb-4">Beta Disclaimer</h3>

          {/* Body Text */}
          <div className="text-sm text-grey-600 leading-relaxed space-y-3 mb-6">
            <p>Please note that PolyPay is currently in beta and is used entirely at your own risk.</p>
            <p>
              We will not be liable to you for any damages or losses (including but not limited to loss of funds)
              arising out of or relating to your use of the application.
            </p>
            <p className="text-grey-800 font-medium">
              By clicking Agree, you confirm that you have read and understood this notice.
            </p>
          </div>

          {/* Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowFor30Days}
              onChange={e => setDontShowFor30Days(e.target.checked)}
              className="w-5 h-5 rounded border-grey-300 accent-pink-350 cursor-pointer"
            />
            <span className="text-sm text-grey-800">Don&apos;t show this notice again for 30 days</span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4">
          <Button
            onClick={handleAgree}
            className="w-full bg-pink-350 hover:bg-pink-400 text-grey-1000 font-medium rounded-lg py-3 cursor-pointer transition-all duration-200"
          >
            I Understand & Agree
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
};

export default DisclaimerModal;
