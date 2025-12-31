import { useCallback } from "react";
import { modalManager } from "~~/components/modals/ModalLayout";
import { ModalName } from "~~/types/modal";

export const useModalApp = () => {
  const openModal = useCallback((modalName: ModalName, props = {}) => {
    if (modalManager.openModal) {
      modalManager.openModal(modalName, props);
    } else {
      console.error(`Cannot open modal. Make sure ModalLayout is mounted. Modal name : ${modalName}`);
    }
  }, []);

  const closeModal = useCallback((modalId?: string) => {
    if (modalManager.closeModal) {
      modalManager.closeModal(modalId);
    } else {
      console.error("Cannot close modal. Make sure ModalLayout is mounted.");
    }
  }, []);

  const closeAllModals = useCallback(() => {
    if (modalManager.closeAllModals) {
      modalManager.closeAllModals();
    } else {
      console.error("Cannot close all modals. Make sure ModalLayout is mounted.");
    }
  }, []);

  return { openModal, closeModal, closeAllModals };
};
