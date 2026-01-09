"use client";

import React from "react";
import Image from "next/image";
import ModalContainer from "../modals/ModalContainer";
import { Button } from "../ui/button";
import { X } from "lucide-react";
import { ModalProps } from "~~/types/modal";

const DevelopingFeatureModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} className="sm:max-w-[500px] p-0" isCloseButton={false}>
      <div className="flex flex-col bg-white rounded-lg overflow-hidden -mx-1.5 -my-4">
        <div className="flex items-center justify-between p-4 pb-2 border-b bg-gray-100">
          <div className="flex items-center gap-2">
            <Image src={"/common/develop-icon.svg"} width={36} height={36} alt="icon" />
            <span className="font-semibold text-gray-900">DEVELOPING FEATURE</span>
          </div>
          <Button
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-1 text-black bg-white cursor-pointer hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col items-center p-8 text-center space-y-3 bg-gray-100">
          <div className="relative w-32 h-32">
            <Image
              src="/common/develop-avatar.svg"
              alt="Development in progress"
              fill
              className="object-contain"
              width={128}
              height={128}
            />
          </div>

          <div className="space-y-2">
            <span className=" w-[100px] block text-sm text-left text-gray-600 font-medium bg-white p-2 rounded-xl absolute top-[85px] right-[100px]">
              We are almost there
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-lg">NOTIFICATION</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              The feature is in development and will be ready soon. Please be patient, we are almost there.
            </p>
          </div>
        </div>

        <div className="p-4">
          <Button onClick={onClose} className="w-full gb-pink-350 text-white rounded-lg py-3 cursor-pointer">
            Got it
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
};

export default DevelopingFeatureModal;
