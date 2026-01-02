import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./endpoints";
import { Notification, SendCommitmentDto } from "@polypay/shared";

export const notificationApi = {
  getAll: async (commitment: string): Promise<Notification[]> => {
    const { data } = await apiClient.get<Notification[]>(API_ENDPOINTS.notifications.byCommitment(commitment));
    return data;
  },

  getUnreadCount: async (commitment: string): Promise<number> => {
    const { data } = await apiClient.get<number>(API_ENDPOINTS.notifications.unreadCount(commitment));
    return data;
  },

  sendCommitment: async (dto: SendCommitmentDto): Promise<Notification> => {
    const { data } = await apiClient.post<Notification>(API_ENDPOINTS.notifications.sendCommitment, dto);
    return data;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const { data } = await apiClient.patch<Notification>(API_ENDPOINTS.notifications.markAsRead(id));
    return data;
  },

  markAllAsRead: async (commitment: string): Promise<void> => {
    await apiClient.patch(API_ENDPOINTS.notifications.markAllAsRead, { commitment });
  },
};
