export type TransactionStepAction = "transfer" | "batch" | "proposal" | "approval";

export function createTransactionSteps(action: TransactionStepAction) {
  const labels: Record<TransactionStepAction, string> = {
    transfer: "Preparing your transfer...",
    batch: "Preparing your batch...",
    proposal: "Preparing your proposal...",
    approval: "Preparing approval...",
  };

  return [
    { id: 1, label: labels[action] },
    { id: 2, label: "Waiting for wallet approval..." },
    { id: 3, label: "Securing your transaction..." },
    { id: 4, label: "Almost done, submitting..." },
  ];
}
