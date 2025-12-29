"use client";

import React from "react";
import ModalContainer from "./ModalContainer";
import { ModalProps } from "~~/types/modal";

interface ConfirmModalProps extends ModalProps {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm?: () => void;
  onCancel?: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Continue",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}) => {
  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} className="sm:max-w-[500px] p-0" isCloseButton={false}>
      <div className="flex flex-col bg-white rounded-lg overflow-hidden -mx-1.5 -my-4">
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-2">{description}</p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={
                variant === "destructive"
                  ? "cursor-pointer px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600"
                  : "cursor-pointer px-4 py-2 text-sm font-medium text-white bg-black border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
              }
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </ModalContainer>
  );
};

export default ConfirmModal;
