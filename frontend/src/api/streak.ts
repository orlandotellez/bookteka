import { api } from "./client";

export interface StreakResponse {
  currentStreak: number;
  startDate: string | null;
  lastActiveDate: string | null;
  hasCompletedToday: boolean;
  isNew?: boolean;
}

export const streakApi = {
  get: () => api.get<StreakResponse>("/streak"),

  complete: (data?: { clientDate?: string; clientTimestamp?: number }) =>
    api.post<StreakResponse>("/streak/complete", data ?? {}),
};
