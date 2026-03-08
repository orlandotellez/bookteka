export interface ReadingSession {
  bookId: string;
  startTime: number;
  accumulatedSeconds: number;
  isActive: boolean;
}

export interface ReadingSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  textWidth: number;
}

export interface StreakData {
  userId?: string;
  currentStreak: number;
  startDate: string | null;
  lastActiveDate: string | null;
  hasCompletedToday: boolean;

}
