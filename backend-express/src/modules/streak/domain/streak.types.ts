



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

