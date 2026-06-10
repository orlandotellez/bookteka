import { create } from "zustand"
import type { ReadingSettings } from "@/shared/types/reading"

const DEFAULT_READING_SETTINGS: ReadingSettings = {
  fontSize: 18,
  fontFamily: "sans",
  lineHeight: 1.7,
  textWidth: 100,
}

interface UserPreferences {
  // State
  cloudSyncEnabled: boolean
  defaultReadingSettings: ReadingSettings

  // Actions
  setCloudSyncEnabled: (enabled: boolean) => void
  setDefaultReadingSettings: (settings: ReadingSettings) => void
  resetReadingSettings: () => void
}

export const useUserPreferences = create<UserPreferences>((set) => ({
  // Initial state
  cloudSyncEnabled: false,
  defaultReadingSettings: DEFAULT_READING_SETTINGS,

  // Actions
  setCloudSyncEnabled: (enabled: boolean) => {
    set({ cloudSyncEnabled: enabled })
  },

  setDefaultReadingSettings: (settings: ReadingSettings) => {
    set({ defaultReadingSettings: settings })
  },

  resetReadingSettings: () => {
    set({ defaultReadingSettings: DEFAULT_READING_SETTINGS })
  },
}))
