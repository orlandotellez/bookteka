import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LibraryView, ReadingSettings } from "@/types/reading";

export type AuthMode = "local" | "server";

export const LOCAL_USER_ID = "local-user";

const DEFAULT_READING_SETTINGS: ReadingSettings = {
  fontSize: 18,
  fontFamily: "sans",
  lineHeight: 1.7,
  textWidth: 70,
};

interface UserPreferences {
  authMode: AuthMode;
  cloudSyncEnabled: boolean;
  defaultReadingSettings: ReadingSettings;
  defaultView: LibraryView;
  setAuthMode: (mode: AuthMode) => void;
  setCloudSyncEnabled: (enabled: boolean) => void;
  setDefaultReadingSettings: (settings: ReadingSettings) => void;
  resetReadingSettings: () => void;
  setDefaultView: (view: LibraryView) => void;
}

export const useUserPreferences = create<UserPreferences>()(
  persist(
    (set) => ({
      authMode: "server",
      cloudSyncEnabled: false,
      defaultReadingSettings: DEFAULT_READING_SETTINGS,
      defaultView: "shelf",

      setAuthMode: (mode: AuthMode) => {
        set({ authMode: mode });
      },

      setCloudSyncEnabled: (enabled: boolean) => {
        set({ cloudSyncEnabled: enabled });
      },

      setDefaultReadingSettings: (settings: ReadingSettings) => {
        set({ defaultReadingSettings: settings });
      },

      setDefaultView: (view: LibraryView) => {
        set({ defaultView: view });
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