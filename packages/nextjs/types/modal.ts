import { ReactNode } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
  title?: string;
  desc?: string;
  className?: string;
  isCloseButton?: boolean;
}

export type ModalComponent = React.ComponentType<ModalProps>;

export type ModalRegistry = Record<string, ModalComponent>;

export type ModalName =
  | "qrAddressReceiver"
  | "generateCommitment"
  | "confirm"
  | "editAccount"
  | "developingFeature"
  | "removeBatch"
  | "createGroup"
  | "createContact"
  | "deleteContact"
  | "requestFeature"
  | "removeSigner"
  | "signerList"
  | "switchAccount"
  | "disclaimer"
  // Quest + Leaderboard hidden — modal names retained as comments for future restore.
  // | "claimReward"
  // | "questIntro"
  | "createBatchFromContacts"
  | "depositX402"
  | "receiveMethod";
