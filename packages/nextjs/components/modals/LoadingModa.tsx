"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingModalProps {
  isOpen: boolean;
  loadingText?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ isOpen, loadingText = "Loading..." }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-[500px] h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="w-16 h-16 text-[#6D2EFF] animate-spin" />
          <p className="text-xl font-semibold text-gray-900">{loadingText}</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingModal;
