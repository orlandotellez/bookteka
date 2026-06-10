import type { StreakData } from "@/shared/types/reading"
import { getDatabase, getCurrentUserId } from "../connection"

export async function getStreakData(): Promise<StreakData | null> {
  const uid = getCurrentUserId()
  if (!uid) return null

  const db = await getDatabase()
  const row = await db.getFirstAsync(
    "SELECT * FROM streaks WHERE userId = ?",
    [uid],
  )
  return row ? rowToStreakData(row) : null
}

export async function saveStreakData(streakData: StreakData): Promise<void> {
  const uid = getCurrentUserId()
  if (!uid) throw new Error("No hay usuario autenticado")

  const db = await getDatabase()
  await db.runAsync(
    `INSERT OR REPLACE INTO streaks (id, userId, currentStreak, startDate, lastActiveDate, hasCompletedToday)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      streakData.id ?? uid,
      uid,
      streakData.currentStreak,
      streakData.startDate,
      streakData.lastActiveDate,
      streakData.hasCompletedToday ? 1 : 0,
    ],
  )
}

function rowToStreakData(row: any): StreakData {
  return {
    id: row.id,
    userId: row.userId ?? undefined,
    currentStreak: row.currentStreak,
    startDate: row.startDate,
    lastActiveDate: row.lastActiveDate,
    hasCompletedToday: row.hasCompletedToday === 1,
  }
}
