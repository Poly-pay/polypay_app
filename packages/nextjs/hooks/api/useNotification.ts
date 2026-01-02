import { useCallback } from "react";
import { useSocketEvent } from "../app/useSocketEvent";
import { NOTIFICATION_NEW_EVENT, Notification } from "@polypay/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "~~/services/api";
import { useIdentityStore } from "~~/services/store/useIdentityStore";

// ============ Query Keys ============

export const notificationKeys = {
  all: ["notifications"] as const,
  byCommitment: (commitment: string) => [...notificationKeys.all, commitment] as const,
  unreadCount: (commitment: string) => [...notificationKeys.all, "unread-count", commitment] as const,
};

// ============ Hooks ============

/**
 * Get notifications for current user
 */
export const useNotifications = () => {
  const { commitment } = useIdentityStore();

  return useQuery({
    queryKey: notificationKeys.byCommitment(commitment!),
    queryFn: () => notificationApi.getAll(commitment!),
    enabled: !!commitment,
  });
};

/**
 * Get unread notification count
 */
export const useUnreadCount = () => {
  const { commitment } = useIdentityStore();

  return useQuery({
    queryKey: notificationKeys.unreadCount(commitment!),
    queryFn: () => notificationApi.getUnreadCount(commitment!),
    enabled: !!commitment,
  });
};

/**
 * Send commitment to another user
 */
export const useSendCommitment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationApi.sendCommitment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

/**
 * Mark single notification as read
 */
export const useMarkNotificationAsRead = () => {
  const { commitment } = useIdentityStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationApi.markAsRead,
    onSuccess: updatedNotification => {
      // Update notification in cache
      queryClient.setQueryData<Notification[]>(notificationKeys.byCommitment(commitment!), old =>
        old?.map(n => (n.id === updatedNotification.id ? { ...n, read: true } : n)),
      );

      // Decrease unread count
      queryClient.setQueryData<number>(notificationKeys.unreadCount(commitment!), old => Math.max((old ?? 1) - 1, 0));
    },
  });
};

/**
 * Mark all notifications as read
 */
export const useMarkAllNotificationsAsRead = () => {
  const { commitment } = useIdentityStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(commitment!),
    onSuccess: () => {
      // Update all notifications in cache
      queryClient.setQueryData<Notification[]>(notificationKeys.byCommitment(commitment!), old =>
        old?.map(n => ({ ...n, read: true })),
      );

      // Reset unread count
      queryClient.setQueryData<number>(notificationKeys.unreadCount(commitment!), 0);
    },
  });
};

// ============ Realtime Hook ============

/**
 * Listen for realtime notification updates
 * Use this in components that display notifications
 */
export const useNotificationRealtime = () => {
  const { commitment } = useIdentityStore();
  const queryClient = useQueryClient();

  const handleNewNotification = useCallback(
    (notification: Notification) => {
      console.log("[Socket] New notification:", notification);

      if (!commitment) return;

      // Add new notification to cache
      queryClient.setQueryData<Notification[]>(notificationKeys.byCommitment(commitment), old =>
        old ? [notification, ...old] : [notification],
      );

      // Update unread count
      queryClient.setQueryData<number>(notificationKeys.unreadCount(commitment), old => (old ?? 0) + 1);
    },
    [commitment, queryClient],
  );

  useSocketEvent(NOTIFICATION_NEW_EVENT, handleNewNotification);
};
