"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { DialogOverlay, DialogPortal } from "@radix-ui/react-dialog";
import { QRCodeSVG } from "qrcode.react";
import { notification } from "~~/utils/scaffold-eth";

interface ReceiveModalProps {
  children: React.ReactNode;
  address: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({ children, address, open, onOpenChange }) => {
  // Internal state for uncontrolled mode
  const [internalOpen, setInternalOpen] = useState(false);

  // Determine if controlled or uncontrolled
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    notification.success("Address copied to clipboard");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <div onClick={handleOpenModal} className="contents">
        {children}
      </div>

      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999]" />
        <DialogContent className=" bg-white border-0 shadow-2xl z-[1000] bg-[url('/common/bg-qrcode.png')] bg-no-repeat bg-center bg-cover rounded-2xl w-[600px] px-0 pb-0">
          <div className="flex flex-col p-5 pb-0">
            {/* Header */}
            <DialogHeader className="w-full mb-3">
              <div className="flex items-center justify-center">
                <DialogTitle className="font-semibold text-white text-[24px] w-[420px] ">
                  Scan the QR code or copy your wallet address to receive tokens securely
                </DialogTitle>
              </div>
            </DialogHeader>

            {/* QR Code */}
            <div className=" mb-4 p-4 flex flex-col gap-5 justify-center items-center bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
              <QRCodeSVG
                value={address}
                size={280}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                imageSettings={{
                  src: `/logo/polypay-icon.svg`,
                  width: 64,
                  height: 64,
                  excavate: true,
                }}
                className="border-[#FF7CEB] border-8 rounded-3xl  cursor-pointer"
                onClick={handleCopy}
              />
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between gap-2 p-3 bg-gray-200 rounded-2xl border">
                  <div className="flex-1 font-mono text-md text-[#1E1E1E] font-semibold break-all">{address}</div>
                  <span className="text-white bg-black px-3 py-1 rounded-3xl cursor-pointer" onClick={handleCopy}>
                    Copy
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};
