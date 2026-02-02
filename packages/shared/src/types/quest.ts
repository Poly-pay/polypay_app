import { QuestCategory, QuestCode } from "../enums/quest";

export interface Quest {
  id: string;
  code: QuestCode | string;
  name: string;
  description?: string | null;
  points: number;
  type: QuestCategory;
  isActive: boolean;
  createdAt: string;
}

export interface PointHistory {
  id: string;
  userId: string;
  questId: string;
  points: number;
  accountId?: string | null;
  txId?: number | null;
  earnedAt: string;
  quest?: Quest;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  commitment: string | null;
  totalPoints: number;
}

export interface UserPoints {
  totalPoints: number;
  rank: number | null;
  history: PointHistory[];
}
