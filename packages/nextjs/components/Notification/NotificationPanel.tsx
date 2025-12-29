"use client";

import React from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { NotificationItem } from "./NotificationItem";
import { SendCommitmentModal } from "./SendCommitmentModal";
import { Bell } from "lucide-react";
import { useMarkAllAsRead, useNotifications, useUnreadCount } from "~~/hooks/api/useNotification";

export const NotificationPanel: React.FC = () => {
  const { data: notifications, isLoading } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const { mutate: markAllAsRead } = useMarkAllAsRead();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <div className="w-[65px] relative flex items-center justify-center bg-white rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          <Image src="/misc/bell-icon.gif" alt="Bell" width={35} height={35} />
        </div>
      </SheetTrigger>

      <SheetContent side="right" className="w-[350px] h-[90%] p-0 border-l-0 top-[50px] right-[10px] rounded-lg">
        <div className="flex flex-col h-full bg-gray-200 p-1 rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-white rounded-t-lg">
            <span className="text-xl font-semibold text-[#1B1B1B]">Notifications</span>

            <div className="flex items-center gap-2">
              {Number(unreadCount) > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => markAllAsRead()}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Mark all as read
                </Button>
              )}

              {/* <SheetTrigger asChild>
                <Button size="sm" className="h-8 w-8 p-0 bg-gray-100 hover:bg-gray-200">
                  <X className="h-4 w-4 text-gray-600" />
                </Button>
              </SheetTrigger> */}
            </div>
          </div>

          <div className="px-4 py-2 bg-white border-b">
            <SendCommitmentModal />
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto bg-white rounded-b-lg p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <span className="text-gray-500">Loading...</span>
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="flex flex-col gap-2">
                {notifications.map(notification => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <Bell className="w-8 h-8 mb-2 text-gray-300" />
                <span>No notifications</span>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
