"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { ConfirmDialog } from "./Confirm";
import { Copy, Trash2, X } from "lucide-react";
import { useWalletClient } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";

interface EditAccountModalProps {
  children: React.ReactNode;
  accountName?: string;
  signers?: string[];
  threshold?: number;
  onUpdate?: () => void; // Callback to refresh wallet data
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  children,
  accountName = "ICP",
  signers = [],
  threshold = 0,
  onUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editThreshold, setEditThreshold] = useState(threshold);
  const [newSignerAddress, setNewSignerAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: walletClient } = useWalletClient();

  const handleAddSigner = async () => {
    setLoading(true);
    // try {
    //   await addSigner(currentWallet.name, newSignerAddress.trim());
    //   setNewSignerAddress("");
    //   onUpdate?.(); // Refresh wallet data
    //   setIsOpen(false);
    // } catch (error) {
    //   console.error("Failed to add signer:", error);
    //   alert("Failed to add signer. Please try again.");
    // } finally {
    //   setLoading(false);
    // }
  };

  const handleRemoveSigner = async (signerAddress: string) => {
    // if (!currentWallet?.name) return;
    // if (signers.length <= 1) {
    //   toast.warning("Cannot remove last signer");
    //   return;
    // }
    // const currentPrincipal = identity?.getPrincipal().toString() || "";
    // if (!signers.includes(currentPrincipal)) {
    //   toast.warning("Current user is not authorized to remove signers");
    //   return;
    // }
    // setLoading(true);
    // try {
    //   await removeSigner(currentWallet.name, signerAddress);
    //   onUpdate?.(); // Refresh wallet data
    //   setIsOpen(false);
    // } catch (error) {
    //   console.error("Failed to remove signer:", error);
    //   alert("Failed to remove signer. Please try again.");
    // } finally {
    //   setLoading(false);
    // }
  };

  const handleUpdateThreshold = async () => {
    // if (!currentWallet?.name) return;
    // if (editThreshold < 1 || editThreshold > signers.length) {
    //   alert("Invalid threshold value");
    //   return;
    // }
    // if (editThreshold === threshold) {
    //   setIsOpen(false);
    //   return;
    // }
    // if (!confirm(`Change threshold to ${editThreshold} of ${signers.length}?`)) return;
    // setLoading(true);
    // try {
    //   await setThreshold(currentWallet.name, editThreshold);
    //   onUpdate?.(); // Refresh wallet data
    //   setIsOpen(false);
    // } catch (error) {
    //   console.error("Failed to update threshold:", error);
    //   alert("Failed to update threshold. Please try again.");
    // } finally {
    //   setLoading(false);
    // }
  };

  const handleSave = () => {
    // If threshold changed, update it
    // if (editThreshold !== threshold) {
    //   handleUpdateThreshold();
    // } else {
    //   toast.warning("No changes to save.");
    // }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] p-0" showCloseButton={false}>
        <DialogTitle hidden></DialogTitle>
        <div className="flex flex-col h-full bg-white rounded-lg">
          {/* Header */}
          <div className="flex flex-row items-center justify-between p-3 m-1 border-b bg-[#EDEDED] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gray-200 flex items-center justify-center">
                <img src={"/common/edit-wallet.svg"} alt="Edit wallet" />
              </div>
              <span className="flex flex-col">
                <span className="text-lg font-semibold text-black">EDIT YOUR WALLET</span>
                <span
                  className="text-sm cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(walletClient?.account?.address ?? "");
                    notification.success("Address copied to clipboard");
                  }}
                >
                  <span className="text-black">Ethereum </span>{" "}
                  <span className="text-primary">
                    [{walletClient?.account?.address?.slice(0, 3)}...{walletClient?.account?.address?.slice(-3)}]
                  </span>
                </span>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0 bg-white hover:bg-white/50 text-black cursor-pointer"
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 pt-3 space-y-6">
            {/* Account Signers Section */}
            <div>
              <h3 className="font-semibold text-gray-900">WALLET SIGNERS</h3>
              <p className="text-sm text-gray-500 mb-4">
                Addresses added to the signers list below will play an important role in approving future transactions
                as team members.
              </p>

              {/* Existing Signers */}
              <div className="space-y-3 mb-4">
                {signers.map((signer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <span className="font-mono text-sm text-gray-900 w-[500px] truncate">{signer}</span>
                    <div className="flex items-center gap-2 ">
                      <Button
                        variant="ghost"
                        size="sm"
                        // onClick={() => copyAddressToClipboard(signer)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 cursor-pointer"
                        disabled={loading}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <ConfirmDialog
                        title="Confirm Remove Signer"
                        description="Are you sure you want to remove this signer?"
                        onConfirm={() => handleRemoveSigner(signer)}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 cursor-pointer"
                          disabled={loading || signers.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Signer */}
              <div className="space-y-2 p-3 border border-dashed border-gray-300 rounded-lg">
                <Input
                  placeholder="Enter signer principal"
                  value={newSignerAddress}
                  onChange={e => setNewSignerAddress(e.target.value)}
                  className="font-mono text-sm "
                  disabled={loading}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddSigner}
                  className="w-full cursor-pointer bg-[#6D2EFF] text-white"
                  disabled={loading || !newSignerAddress.trim()}
                >
                  {loading ? "Adding..." : "Add New Signer"}
                </Button>
              </div>
            </div>

            {/* Threshold Section */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">THRESHOLD</h3>
              <p className="text-sm text-gray-500 mb-4">
                This is the minimum number of confirmations required for a transaction to go through. Anyone on the list
                can approve the transaction as long as the minimum number of approvals is met.
              </p>

              <div className="flex flex-col items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max={signers.length}
                    value={editThreshold}
                    onChange={e => setEditThreshold(Number(e.target.value))}
                    className="w-[490px] text-center"
                    disabled={loading}
                  />
                  <span className="text-sm text-gray-500"> /out of {signers.length} signers</span>
                </div>

                <Button
                  onClick={handleSave}
                  className=" w-full flex-1 bg-[#FF7CEB] hover:opacity-100 cursor-pointer text-white"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
