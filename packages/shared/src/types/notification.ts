import { NotificationType } from "../enums";
import { User } from "./user";

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  sender?: User;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}
