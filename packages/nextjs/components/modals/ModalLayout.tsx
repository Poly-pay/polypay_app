"use client";

import React, { ComponentType, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ModalName } from "~~/types/modal";

type ModalComponent = ComponentType<{
  isOpen: boolean;
  onClose: () => void;
  onAfterClose?: () => void;
  [key: string]: any;
}>;

export type ModalRegistry = Record<ModalName, ModalComponent>;

const modals: ModalRegistry = {
  qrAddressReceiver: dynamic(() => import("./QRAddressReceiverModal"), {
    ssr: false,
  }),
  generateCommitment: dynamic(() => import("./GenerateCommitmentModal"), {
    ssr: false,
  }),
  confirm: dynamic(() => import("./ConfirmModal"), {
    ssr: false,
  }),
  editAccount: dynamic(() => import("./EditAccountModal"), {
    ssr: false,
  }),
  developingFeature: dynamic(() => import("./DevelopingFeatureModal"), {
    ssr: false,
  }),
  removeBatch: dynamic(() => import("./RemoveBatchModal"), {
    ssr: false,
  }),
  createGroup: dynamic(() => import("./CreateGroupModal"), {
    ssr: false,
  }),
  createContact: dynamic(() => import("./CreateContactModal"), {
    ssr: false,
  }),
  deleteContact: dynamic(() => import("./DeleteContactModal"), {
    ssr: false,
  }),
  requestFeature: dynamic(() => import("./RequestFeatureModal"), {
    ssr: false,
  }),
  removeSigner: dynamic(() => import("./RemoveSignerModal"), {
    ssr: false,
  }),
  signerList: dynamic(() => import("./SignerListModal"), {
    ssr: false,
  }),
  switchAccount: dynamic(() => import("./SwitchAccountModal"), { ssr: false }),
  disclaimer: dynamic(() => import("./DisclaimerModal"), { ssr: false }),
  claimReward: dynamic(() => import("./ClaimRewardModal"), { ssr: false }),
};

type ModalInstance = {
  id: string;
  name: ModalName;
  props: Record<string, any>;
};

type ModalManagerType = {
  openModal: ((name: ModalName, props?: Record<string, any>) => void) | null;
  closeModal: ((id?: string) => void) | null;
  closeAllModals: (() => void) | null;
};

export const modalManager: ModalManagerType = {
  openModal: null,
  closeModal: null,
  closeAllModals: null,
};

export const ModalLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeModals, setActiveModals] = useState<ModalInstance[]>([]);
  const modalIdCounter = useRef(0);

  const openModal = useCallback((modalName: ModalName, props: Record<string, any> = {}) => {
    if (modals[modalName]) {
      const newModal: ModalInstance = {
        id: `modal-${modalIdCounter.current++}`,
        name: modalName,
        props,
      };
      setActiveModals(prev => [...prev, newModal]);
    }
  }, []);

  const closeModal = useCallback((modalId?: string) => {
    if (modalId) {
      setActiveModals(prev => {
        const modal = prev.find(m => m.id === modalId);
        if (modal?.props?.onAfterClose) {
          modal.props.onAfterClose();
        }
        return prev.filter(m => m.id !== modalId);
      });
    } else {
      setActiveModals(prev => {
        if (prev.length > 0) {
          const lastModal = prev[prev.length - 1];
          if (lastModal?.props?.onAfterClose) {
            lastModal.props.onAfterClose();
          }
          return prev.slice(0, -1);
        }
        return prev;
      });
    }
  }, []);

  const closeAllModals = useCallback(() => {
    activeModals.forEach(modal => {
      if (modal.props?.onAfterClose) {
        modal.props.onAfterClose();
      }
    });
    setActiveModals([]);
  }, [activeModals]);

  useEffect(() => {
    modalManager.openModal = openModal;
    modalManager.closeModal = closeModal;
    modalManager.closeAllModals = closeAllModals;

    return () => {
      modalManager.openModal = null;
      modalManager.closeModal = null;
      modalManager.closeAllModals = null;
    };
  }, [openModal, closeModal, closeAllModals]);

  const ModalComponents = useMemo(() => {
    return activeModals.map(modal => {
      const Component = modals[modal.name];
      return (
        <Component
          key={modal.id}
          isOpen
          onClose={() => closeModal(modal.id)}
          onAfterClose={modal.props?.onAfterClose}
          type={modal.props?.type}
          {...modal.props}
        />
      );
    });
  }, [activeModals, closeModal]);

  return (
    <>
      {children}
      {ModalComponents}
    </>
  );
};
