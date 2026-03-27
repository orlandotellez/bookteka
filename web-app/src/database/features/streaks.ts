import type { StreakData } from "../schema";
import { getDatabase } from "../connection";
import { getCurrentUserId } from "../connection";

const API_URL = import.meta.env.VITE_API_URL || "/api";

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
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return null;

  try {
    const response = await fetch(`${API_URL}/streak`, {
      credentials: "include",
    });

    if (!response.ok) {
      console.error("Error al obtener racha del servidor");
      return null;
    }

    const data = await response.json();

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
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return null;

  try {
    const response = await fetch(`${API_URL}/streak/complete`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Error al completar día en servidor");
      return null;
    }

    const data = await response.json();

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

// Inicializa la racha en el backend
export async function initializeStreakInCloud(
  _currentStreak: number, // Ya no se usa, el backend calcula automáticamente
  startDate?: string
): Promise<StreakData | null> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return null;

  try {
    const response = await fetch(`${API_URL}/streak/initialize`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
      }),
    });

    if (!response.ok) {
      console.error("Error al inicializar racha en servidor");
      return null;
    }

    const data = await response.json();

    // Actualizar también en IndexedDB
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
    console.error("Error initializing streak in cloud:", error);
    return null;
  }
}
