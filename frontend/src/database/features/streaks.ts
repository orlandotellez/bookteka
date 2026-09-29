import type { StreakData } from "../schema";
import { getDatabase } from "../connection";
import { getCurrentUserId } from "../connection";

import { streakApi } from "@/api/streak";
import { isCloudAvailable } from "@/lib/cloud";
import { useUserPreferences } from "@/store/userPreferencesStore";

function hasCloudForStreak(): boolean {
  return isCloudAvailable(useUserPreferences.getState().authMode);
}

// Obtiene los datos de la racha del usuario actual
export async function getStreakData(): Promise<StreakData | null> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return null;

  const db = await getDatabase();
  const data = await db.get("streaks", currentUserId);
  return data ?? null;
}

// Guarda los datos de la racha
export async function saveStreakData(streakData: StreakData): Promise<void> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) throw new Error("No hay usuario autenticado");

  const db = await getDatabase();
  await db.put("streaks", {
    id: currentUserId,
    userId: currentUserId,
    ...streakData,
  });
}

// Sincroniza la racha con el backend
export async function syncStreakFromCloud(): Promise<StreakData | null> {
  if (!hasCloudForStreak()) return null;
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return null;

  try {
    const data = await streakApi.get();

    // Guardar en IndexedDB para caché local
    const streakData: StreakData = {
      userId: currentUserId,
      currentStreak: data.currentStreak,
      startDate: data.startDate,
      lastActiveDate: data.lastActiveDate,
      hasCompletedToday: data.hasCompletedToday,
    };

    await saveStreakData(streakData);
    return streakData;
  } catch (error) {
    console.error("Error sync streak:", error);
    return null;
  }
}

// Completa el día actual en el backend
export async function completeDayInCloud(): Promise<{
  currentStreak: number;
  startDate: string | null;
  lastActiveDate: string | null;
  hasCompletedToday: boolean;
} | null> {
  if (!hasCloudForStreak()) return null;
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return null;

  try {
    const data = await streakApi.complete();

    // Actualizar también en IndexedDB
    const streakData: StreakData = {
      userId: currentUserId,
      currentStreak: data.currentStreak,
      startDate: data.startDate,
      lastActiveDate: data.lastActiveDate,
      hasCompletedToday: data.hasCompletedToday,
    };

    await saveStreakData(streakData);
    return data;
  } catch (error) {
    console.error("Error completing day in cloud:", error);
    return null;
  }
}
