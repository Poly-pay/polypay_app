import { useEffect } from "react";
import { NOTIFICATION_NEW_EVENT, Notification, SendCommitmentDto } from "@polypay/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "~~/constants";
import { useSocket } from "~~/hooks/app/useSocket";
import { useIdentityStore } from "~~/services/store/useIdentityStore";

// ============ API Functions ============

const fetchNotificationsAPI = async (commitment: string): Promise<Notification[]> => {
  const response = await fetch(`${API_BASE_URL}/api/notifications?commitment=${commitment}`);

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return response.json();
};

const fetchUnreadCountAPI = async (commitment: string): Promise<number> => {
  const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count?commitment=${commitment}`);

  if (!response.ok) {
    throw new Error("Failed to fetch unread count");
  }

  return response.json();
};

const sendCommitmentAPI = async (dto: SendCommitmentDto): Promise<Notification> => {
  const response = await fetch(`${API_BASE_URL}/api/notifications/send-commitment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to send commitment");
  }

  return response.json();
};

const markAsReadAPI = async (id: string): Promise<Notification> => {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Failed to mark as read");
  }

  return response.json();
};

const markAllAsReadAPI = async (commitment: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commitment }),
  });

  if (!response.ok) {
    throw new Error("Failed to mark all as read");
  }
};

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
  const socket = useSocket();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: notificationKeys.byCommitment(commitment!),
    queryFn: () => fetchNotificationsAPI(commitment!),
    enabled: !!commitment,
  });

  // Listen for realtime notifications
  useEffect(() => {
    if (!socket || !commitment) return;

    const handleNewNotification = (notification: Notification) => {
      // Add new notification to cache
      queryClient.setQueryData<Notification[]>(notificationKeys.byCommitment(commitment), old =>
        old ? [notification, ...old] : [notification],
      );

      // Update unread count
      queryClient.setQueryData<number>(notificationKeys.unreadCount(commitment), old => (old ?? 0) + 1);
    };

    socket.on(NOTIFICATION_NEW_EVENT, handleNewNotification);

    return () => {
      socket.off(NOTIFICATION_NEW_EVENT, handleNewNotification);
    };
  }, [socket, commitment, queryClient]);

  return query;
};

/**
 * Get unread notification count
 */
export const useUnreadCount = () => {
  const { commitment } = useIdentityStore();

  return useQuery({
    queryKey: notificationKeys.unreadCount(commitment!),
    queryFn: () => fetchUnreadCountAPI(commitment!),
    enabled: !!commitment,
  });
};

/**
 * Send commitment to another user
 */
export const useSendCommitment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendCommitmentAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

/**
 * Mark single notification as read
 */
export const useMarkAsRead = () => {
  const { commitment } = useIdentityStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsReadAPI,
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
export const useMarkAllAsRead = () => {
  const { commitment } = useIdentityStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllAsReadAPI(commitment!),
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
