import { NotificationType } from "../enums";
import { Account } from "./account";

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  sender?: Account;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}
