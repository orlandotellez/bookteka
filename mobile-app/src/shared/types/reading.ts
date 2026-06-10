export interface ReadingSession {
  bookId: string
  startTime: number
  accumulatedSeconds: number
  isActive: boolean
}

export interface ReadingSettings {
  fontSize: number
  fontFamily: "sans" | "serif" | "mono" | "dyslexic"
  lineHeight: number
  textWidth: number
}

export interface StreakData {
  id?: string
  userId?: string
  currentStreak: number
  startDate: string
  lastActiveDate: string
  hasCompletedToday: boolean
}
