import { create } from "zustand"
import { generateId } from "@/utils/generateId"

import type { StreakData } from "@/shared/types/reading"
import { getStreakData, saveStreakData } from "@/shared/database"

const getDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getTodayDate = (): string => getDateString(new Date())

const getYesterdayDate = (): string => {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return getDateString(date)
}

const checkHasCompletedToday = (lastActiveDate: string | null): boolean => {
  if (!lastActiveDate) return false
  return lastActiveDate === getTodayDate()
}

interface StreakStore {
  // State
  streakData: StreakData | null
  isStreakLoading: boolean

  // Actions
  loadStreakData: () => Promise<void>
  completeDay: () => Promise<boolean | undefined>
  initializeStreak: (days: number, startDate?: string) => Promise<void>
}

export const useStreakStore = create<StreakStore>((set, get) => ({
  // Initial state
  streakData: null,
  isStreakLoading: false,

  // Load streak data from local DB
  loadStreakData: async () => {
    const currentData = get().streakData

    // If we already have local data, don't show loading
    if (currentData) {
      set({ isStreakLoading: true })
    }

    try {
      const data = await getStreakData()
      if (data) {
        const hasCompletedToday = checkHasCompletedToday(data.lastActiveDate)
        set({
          streakData: { ...data, hasCompletedToday },
          isStreakLoading: false,
        })
        return
      }

      // No data found — keep what we had (or null if first time)
      set({ isStreakLoading: false })
    } catch (error) {
      console.error("Error loading streak:", error)
      set({ isStreakLoading: false })
    }
  },

  // Complete today's reading day
  completeDay: async () => {
    const { streakData } = get()

    try {
      // Phase 5: try cloud first, fallback to local
      // For now, local-only logic

      if (!streakData) {
        // First ever completion
        const today = getTodayDate()
        const newData: StreakData = {
          id: generateId(),
          currentStreak: 1,
          startDate: today,
          lastActiveDate: today,
          hasCompletedToday: true,
        }
        await saveStreakData(newData)
        set({ streakData: newData })
        return true
      }

      const today = getTodayDate()

      // Idempotent: already completed today
      if (streakData.lastActiveDate === today) {
        return false
      }

      const yesterday = getYesterdayDate()
      let newStreak: number

      if (streakData.lastActiveDate === yesterday) {
        newStreak = streakData.currentStreak + 1
      } else {
        // Gap detected — reset streak
        newStreak = 1
      }

      const newData: StreakData = {
        ...streakData,
        id: streakData.id || uuidv4(),
        currentStreak: newStreak,
        startDate: streakData.startDate || today,
        lastActiveDate: today,
        hasCompletedToday: true,
      }

      await saveStreakData(newData)
      set({ streakData: newData })
      return true
    } catch (error) {
      console.error("Error completing day:", error)
      return undefined
    }
  },

  // Initialize streak (e.g., when user first logs in or migrates data)
  initializeStreak: async (_days: number, startDate?: string) => {
    set({ isStreakLoading: true })
    const today = getTodayDate()
    const initialDate = startDate || today

    try {
      // Calculate streak days from start date
      let calculatedStreak = 1
      if (startDate) {
        const start = new Date(startDate)
        const now = new Date()
        const diffTime = now.getTime() - start.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        calculatedStreak = diffDays < 0 ? 0 : diffDays + 1
      }

      const newData: StreakData = {
        id: generateId(),
        currentStreak: calculatedStreak,
        startDate: initialDate,
        lastActiveDate: today,
        hasCompletedToday: true,
      }

      await saveStreakData(newData)
      set({
        streakData: newData,
        isStreakLoading: false,
      })
    } catch (error) {
      console.error("Error initializing streak:", error)
      set({ isStreakLoading: false })
    }
  },
}))
