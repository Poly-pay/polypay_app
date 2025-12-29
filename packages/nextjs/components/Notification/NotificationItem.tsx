"use client";

import React from "react";
import { Notification } from "@polypay/shared";
import { Check, Copy } from "lucide-react";
import { useMarkAsRead } from "~~/hooks/api/useNotification";
import { notification as toast } from "~~/utils/scaffold-eth";

interface NotificationItemProps {
  notification: Notification;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const { mutate: markAsRead } = useMarkAsRead();
  const [copied, setCopied] = React.useState(false);

  const senderCommitment = notification.sender?.commitment || "";
  const truncatedCommitment = `${senderCommitment.slice(0, 10)}...${senderCommitment.slice(-8)}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(senderCommitment);
      setCopied(true);
      toast.success("Commitment copied!");

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy" +  error);
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
        notification.read ? "bg-white" : "bg-blue-50"
      } hover:bg-gray-100`}
    >
      <div className="flex items-center gap-3">
        {/* Unread indicator */}
        {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}

        <div className="flex flex-col">
          <span className="text-sm text-gray-500">Someone sent you a commitment</span>
          <span className="font-mono text-sm text-[#1B1B1B]">{truncatedCommitment}</span>
        </div>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        title="Copy commitment"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
      </button>
    </div>
  );
};
