"use client";

import { forwardRef, useImperativeHandle } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { cn } from "~~/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAfterClose?: () => void;
  children: React.ReactNode;
  title?: string;
  desc?: string;
  icon?: string;
  isCloseButton?: boolean;
  className?: string;
  loadingTransaction?: boolean;
  preventClose?: boolean;
}

export interface ModalRef {
  close: () => void;
}

const ModalContainer = forwardRef<ModalRef, ModalProps>(
  (
    {
      isOpen,
      onClose,
      onAfterClose,
      children,
      title,
      desc,
      icon,
      isCloseButton = true,
      className,
      loadingTransaction = false,
      preventClose = false,
    },
    ref,
  ) => {
    const handleClose = () => {
      onClose();
      onAfterClose?.();
    };

    useImperativeHandle(ref, () => ({
      close: handleClose,
    }));

    const handleOpenChange = (open: boolean) => {
      // Prevent close if preventClose or loadingTransaction
      if (!open && (preventClose || loadingTransaction)) {
        return;
      }
      if (!open) {
        handleClose();
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn("rounded-3xl w-[600px] px-1.5 py-4", className)}
          style={{ boxShadow: "0px 0px 46.8px 0px rgba(46, 46, 46, 0.13)" }}
          showCloseButton={isCloseButton}
          onEscapeKeyDown={e => loadingTransaction && e.preventDefault()}
          onPointerDownOutside={e => loadingTransaction && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="sr-only">{title || "Modal"}</DialogTitle>
          </DialogHeader>

          <div className="row-center justify-between">
            <div className="flex justify-start gap-2 items-center">
              {icon && (
                <div className="mt-0.5">
                  <Image src={icon} alt="icon" width={28} height={28} />
                </div>
              )}
              <div>
                {title && <h3 className="text-[22px] font-medium text-grey-950 uppercase">{title}</h3>}
                {desc && <p className="text-[15px] text-gray">{desc}</p>}
              </div>
            </div>
          </div>
          {children}
        </DialogContent>
      </Dialog>
    );
  },
);

ModalContainer.displayName = "ModalContainer";

export default ModalContainer;
