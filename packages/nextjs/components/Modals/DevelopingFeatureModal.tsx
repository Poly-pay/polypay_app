"use client";

import React from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "../ui/dialog";
import { X } from "lucide-react";

interface DevelopingFeatureModalProps {
  children: React.ReactNode;
}

export const DevelopingFeatureModal: React.FC<DevelopingFeatureModalProps> = ({ children }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0" showCloseButton={false}>
        <DialogTitle hidden></DialogTitle>
        <div className="flex flex-col bg-white rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-2 border-b bg-gray-100">
            <div className="flex items-center gap-2">
              <img src={"/common/develop-icon.svg"} width={36} height={36} />
              <span className="font-semibold text-gray-900">DEVELOPING FEATURE</span>
            </div>
            <DialogClose asChild>
              <Button size="sm" className="h-8 w-8 p-1 text-black bg-white cursor-pointer hover:bg-gray-200">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>

          {/* Content */}
          <div className="flex flex-col items-center p-8 text-center space-y-3 bg-gray-100">
            {/* Illustration */}
            <div className="relative w-32 h-32">
              <Image src="/common/develop-avatar.svg" alt="Development in progress" fill className="object-contain" />
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

          {/* Footer */}
          <DialogClose asChild>
            <div className="p-4">
              <Button className="w-full gb-[#FF7CEB] text-white rounded-lg py-3 cursor-pointer">Got it</Button>
            </div>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};
