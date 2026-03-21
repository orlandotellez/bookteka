import { getStreakData, saveStreakData, syncStreakFromCloud, completeDayInCloud, initializeStreakInCloud } from "@/lib/database";

import type { StreakData } from "@/types/reading";
import { create } from "zustand";
import { persist } from "zustand/middleware";
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

// Key para localStorage
const STORAGE_KEY = "bookteka-streak";

export const useStreakStore = create<StreakStore>()(
  persist(
    (set, get) => ({
      // Estados iniciales
      streakData: null,
      isStreakLoading: false,

      // Cargar la racha - usa datos locales primero, luego sync con cloud
      loadStreakData: async () => {
        const currentData = get().streakData;

        // Si ya tenemos datos locales, no mostrar loading ni sobreescribir
        // hasta que el sync con cloud confirme nuevos datos
        if (currentData) {
          set({ isStreakLoading: true });
        }

        try {
          // Intentar sync con cloud (nunca sobreescribir con null)
          const cloudData = await syncStreakFromCloud();
          if (cloudData) {
            set({
              streakData: cloudData,
              isStreakLoading: false,
            });
            return;
          }

          // Si el cloud falla, mantener los datos locales que ya tenemos
          // Solo buscar en IndexedDB si NO tenemos datos locales
          if (!currentData) {
            const data = await getStreakData();
            if (data) {
              const hasCompletedToday = checkHasCompletedToday(data.lastActiveDate);
              set({
                streakData: { ...data, hasCompletedToday },
                isStreakLoading: false,
              });
              return;
            }
          }

          // Si llegamos acá, no hay datos nuevos del cloud ni de IndexedDB
          // Mantener lo que teníamos (o null si es la primera vez)
          set({ isStreakLoading: false });
        } catch (error) {
          console.error("Error loading streak:", error);
          // Si hay error, mantener los datos locales que teníamos
          set({ isStreakLoading: false });
        }
      },

      // Completar racha del día
      completeDay: async () => {
        const { streakData } = get();

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
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ streakData: state.streakData }),
    }
  )
);
