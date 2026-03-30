import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReadingSettings } from "@/types/reading";

const DEFAULT_READING_SETTINGS: ReadingSettings = {
  fontSize: 18,
  fontFamily: "sans",
  lineHeight: 1.7,
  textWidth: 70,
};

interface UserPreferences {
  cloudSyncEnabled: boolean;
  defaultReadingSettings: ReadingSettings;
  setCloudSyncEnabled: (enabled: boolean) => void;
  setDefaultReadingSettings: (settings: ReadingSettings) => void;
  resetReadingSettings: () => void;
}

export const useUserPreferences = create<UserPreferences>()(
  persist(
    (set) => ({
      cloudSyncEnabled: false,
      defaultReadingSettings: DEFAULT_READING_SETTINGS,

      setCloudSyncEnabled: (enabled: boolean) => {
        set({ cloudSyncEnabled: enabled });
      },

      setDefaultReadingSettings: (settings: ReadingSettings) => {
        set({ defaultReadingSettings: settings });
      },

      resetReadingSettings: () => {
        set({ defaultReadingSettings: DEFAULT_READING_SETTINGS });
      },
    }),
    {
      name: "bookteka-user-preferences",
    }
  )
);
