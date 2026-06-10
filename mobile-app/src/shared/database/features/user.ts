import type { UserProfile } from "@/shared/types/user"
import { getDatabase, getCurrentUserId } from "../connection"

export async function getUserProfile(): Promise<UserProfile | null> {
  const uid = getCurrentUserId()
  if (!uid) return null

  const db = await getDatabase()
  const row = await db.getFirstAsync(
    "SELECT * FROM user_profile WHERE userId = ?",
    [uid],
  )
  return row ? rowToUserProfile(row) : null
}

export async function getOrCreateUserProfile(): Promise<UserProfile> {
  const uid = getCurrentUserId()
  if (!uid) throw new Error("No hay usuario autenticado")

  const db = await getDatabase()

  // Try to get existing profile
  const existing = await db.getFirstAsync(
    "SELECT * FROM user_profile WHERE userId = ?",
    [uid],
  )
  if (existing) {
    return rowToUserProfile(existing)
  }

  // Create new profile
  const profile: UserProfile = {
    id: uid,
    createdAt: Date.now(),
    totalReadingTimeSeconds: 0,
  }

  await db.runAsync(
    "INSERT INTO user_profile (id, userId, createdAt, totalReadingTimeSeconds) VALUES (?, ?, ?, ?)",
    [profile.id, uid, profile.createdAt, profile.totalReadingTimeSeconds],
  )

  return profile
}

export async function updateUserReadingTime(additionalSeconds: number): Promise<void> {
  const uid = getCurrentUserId()
  if (!uid) return

  const profile = await getOrCreateUserProfile()
  const newTotal = profile.totalReadingTimeSeconds + additionalSeconds

  const db = await getDatabase()
  await db.runAsync(
    "UPDATE user_profile SET totalReadingTimeSeconds = ? WHERE id = ? AND userId = ?",
    [newTotal, profile.id, uid],
  )
}

export async function getTotalReadingTime(): Promise<number> {
  const uid = getCurrentUserId()
  if (!uid) return 0

  const db = await getDatabase()
  const row = await db.getFirstAsync(
    "SELECT COALESCE(SUM(readingTimeSeconds), 0) AS total FROM books WHERE userId = ?",
    [uid],
  )
  return (row as any)?.total ?? 0
}

function rowToUserProfile(row: any): UserProfile {
  return {
    id: row.id,
    userId: row.userId ?? undefined,
    createdAt: row.createdAt,
    totalReadingTimeSeconds: row.totalReadingTimeSeconds,
  }
}
