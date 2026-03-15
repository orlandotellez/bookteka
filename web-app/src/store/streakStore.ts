import { getStreakData, saveStreakData, syncStreakFromCloud, completeDayInCloud, initializeStreakInCloud } from "@/lib/database";

import type { StreakData } from "@/types/reading";
import { create } from "zustand";
import { getDateString } from "@/utils/time";

const getTodayDate = (): string => getDateString(new Date());

const getYesterdayDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return getDateString(date);
};

const checkHasCompletedToday = (lastActiveDate: string | null): boolean => {
  if (!lastActiveDate) return false;
  return lastActiveDate === getTodayDate();
};

interface StreakWithStatus extends StreakData {
  hasCompletedToday: boolean;
}

interface StreakStore {
  // Estado
  isStreakLoading: boolean;
  streakData: StreakWithStatus | null;

  // Acciones de streak
  loadStreakData: () => Promise<void>;
  completeDay: () => Promise<boolean | undefined>;
  initializeStreak: (days: number, startDate?: string) => Promise<void>;
}

export const useStreakStore = create<StreakStore>((set) => ({
  // Estados iniciales
  streakData: null,
  isStreakLoading: false,

  // Cargar la racha
  loadStreakData: async () => {
    set({ isStreakLoading: true });
    try {
      // Primero intentar cargar desde el backend (fuente de verdad)
      const cloudData = await syncStreakFromCloud();
      if (cloudData) {
        set({
          streakData: cloudData,
          isStreakLoading: false,
        });
        return;
      }

      // Fallback a IndexedDB si el backend falla
      const data = await getStreakData();
      if (data) {
        const hasCompletedToday = checkHasCompletedToday(data.lastActiveDate);
        set({
          streakData: { ...data, hasCompletedToday },
          isStreakLoading: false,
        });
      } else {
        set({ streakData: null, isStreakLoading: false });
      }
    } catch (error) {
      console.error("Error loading streak:", error);
      set({ isStreakLoading: false });
    }
  },

  // Completar racha del día
  completeDay: async () => {
    const { streakData } = useStreakStore.getState();

    try {
      // Usar el backend como fuente de verdad
      const result = await completeDayInCloud();

      if (result) {
        const newData: StreakData = {
          currentStreak: result.currentStreak,
          startDate: result.startDate,
          lastActiveDate: result.lastActiveDate,
          hasCompletedToday: result.hasCompletedToday,
        };

        set({ streakData: newData });
        return result.hasCompletedToday;
      }

      // Fallback al comportamiento local si el backend falla
      if (!streakData) {
        const today = getTodayDate();
        const newData: StreakData = {
          currentStreak: 1,
          startDate: today,
          lastActiveDate: today,
          hasCompletedToday: true,
        };
        await saveStreakData(newData);
        set({ streakData: newData });
        return true;
      }

      const today = getTodayDate();
      if (streakData.lastActiveDate === today) {
        return false;
      }

      const yesterday = getYesterdayDate();
      let newStreak: number;

      if (streakData.lastActiveDate === yesterday) {
        newStreak = streakData.currentStreak + 1;
      } else {
        newStreak = 1;
      }

      const newData: StreakData = {
        currentStreak: newStreak,
        startDate: streakData.startDate || today,
        lastActiveDate: today,
        hasCompletedToday: true,
      };

      await saveStreakData(newData);
      set({ streakData: newData });
      return true;
    } catch (error) {
      console.error("Error completing day:", error);
      return undefined;
    }
  },

  // Inicializar la racha (recibe solo la fecha de inicio, el backend calcula los días)
  initializeStreak: async (_days: number, startDate?: string) => {
    set({ isStreakLoading: true });
    const today = getTodayDate();

    // Usar la fecha proporcionada, o hoy si no hay
    const initialDate = startDate || today;

    try {
      // Intentar primero con el backend (el calcula los días automáticamente)
      const result = await initializeStreakInCloud(0, initialDate);

      if (result) {
        set({
          streakData: { ...result, hasCompletedToday: true },
          isStreakLoading: false,
        });
        return;
      }

      // Fallback local si el backend falla
      // Calcular días basados en la fecha de inicio
      let calculatedStreak = 1;
      if (startDate) {
        const start = new Date(startDate);
        const now = new Date();
        const diffTime = now.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        calculatedStreak = diffDays < 0 ? 0 : diffDays + 1;
      }

      const newData: StreakData = {
        currentStreak: calculatedStreak,
        startDate: initialDate,
        lastActiveDate: today,
        hasCompletedToday: true,
      };

      await saveStreakData(newData);
      set({
        streakData: newData,
        isStreakLoading: false,
      });
    } catch (error) {
      console.error("Error initializing streak:", error);
      set({ isStreakLoading: false });
    }
  },
}));
