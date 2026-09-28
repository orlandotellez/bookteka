export interface StreakData {
  id?: string;
  userId?: string;
  currentStreak: number;
  startDate: string | null;
  lastActiveDate: string | null;
  hasCompletedToday: boolean;
}

export interface UserStreak {
  id: string;

  userId: string;

  currentStreak: number;
  startDate?: Date | null;
  lastActiveDate?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStreakInput {
  userId: string;
  currentStreak: number;
  startDate: Date | null;
  lastActiveDate: Date | null;
  createdAt: Date;
}

export interface UpdateStreakInput {
  currentStreak?: number;
  startDate?: Date | null;
  lastActiveDate?: Date | null;
  updatedAt?: Date;
}

