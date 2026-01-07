"use client";

import React from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "../ui/sheet";
import { NotificationItem } from "./NotificationItem";
import { Bell, X } from "lucide-react";
import { useMarkAllNotificationsAsRead, useNotifications, useUnreadCount } from "~~/hooks/api/useNotification";

export const NotificationPanel: React.FC = () => {
  const { data: notifications, isLoading } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const { mutate: markAllAsRead } = useMarkAllNotificationsAsRead();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <div className="w-[65px] relative flex items-center justify-center bg-white rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          <Image src="/misc/bell-icon.gif" alt="Bell" width={35} height={35} />
          {Number(unreadCount) > 0 && (
            <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-500 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </SheetTrigger>
      <SheetTitle></SheetTitle>

      <SheetContent side="right" className="w-[350px] h-[90%] p-0 border-l-0 top-[50px] right-[10px] rounded-lg">
        <div className="flex flex-col h-full bg-gray-200 p-1 rounded-lg">
          {/* Header */}
          <div className="relative flex items-center p-4 bg-white rounded-t-lg gap-2">
            <span className="text-xl font-semibold text-grey-850">Notifications</span>

            <div className="flex items-center gap-2 mr-3 cursor-pointer">
              {Number(unreadCount) > 0 && (
                <Button
                  size="sm"
                  onClick={() => markAllAsRead()}
                  className="text-sm text-blue-500 bg-blue-50 hover:bg-blue-100 cursor-pointer"
                >
                  Mark all as read
                </Button>
              )}
            </div>

            <SheetTrigger asChild>
              <Button
                size="sm"
                className="h8 w-8 p-4 text-black bg-gray-50 hover:bg-gray-100 cursor-pointer absolute top-4 right-4"
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetTrigger>
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
