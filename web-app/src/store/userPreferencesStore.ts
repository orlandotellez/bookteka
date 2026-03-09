import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserPreferences {
  cloudSyncEnabled: boolean;
  setCloudSyncEnabled: (enabled: boolean) => void;
}

export const useUserPreferences = create<UserPreferences>()(
  persist(
    (set) => ({
      cloudSyncEnabled: false, // Por defecto, OFF

      setCloudSyncEnabled: (enabled: boolean) => {
        set({ cloudSyncEnabled: enabled });
      },
    }),
    {
      name: "bookteka-user-preferences", // key en localStorage
    }
  )
);
