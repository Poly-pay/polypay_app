export interface PendingSigner {
  name: string;
  commitment: string;
}

export interface ExistingSigner {
  commitment: string;
  name: string | null;
  isYou: boolean;
}

export type ModalStep = "edit" | "confirm" | "submitting";

export type ActionMode = "IDLE" | "ADD" | "REMOVE";

export interface EditStepProps {
  // State
  pendingAdds: PendingSigner[];
  pendingRemoves: string[];
  threshold: number;
  showWarning: boolean;

  // Setters
  setPendingAdds: React.Dispatch<React.SetStateAction<PendingSigner[]>>;
  setPendingRemoves: React.Dispatch<React.SetStateAction<string[]>>;
  setThreshold: React.Dispatch<React.SetStateAction<number>>;
  setShowWarning: React.Dispatch<React.SetStateAction<boolean>>;

  // Data
  existingSigners: ExistingSigner[];
  originalThreshold: number;
  loading: boolean;
  loadingState: string;

  // Actions
  onNext: () => void;
  onClose: () => void;
}

export interface ConfirmStepProps {
  // Data
  mode: ActionMode;
  pendingAdds: PendingSigner[];
  removedSigners: ExistingSigner[];
  newThreshold: number;
  totalSignersAfterChanges: number;
  originalThreshold: number;

  // Actions
  onBack: () => void;
  onClose: () => void;
  onSubmit: () => void;

  // Loading
  isLoading?: boolean;
}

export const CONFIRM_DESCRIPTIONS = {
  ADD: "A proposal will be sent to all signers. The new member will be added only after reaching the multisig approval threshold.",
  REMOVE:
    "A proposal will be sent to all signers. The member will be removed only after reaching the multisig approval threshold.",
  THRESHOLD:
    "A proposal will be sent to all signers. The new threshold will be updated only after reaching the multisig approval threshold.",
} as const;
