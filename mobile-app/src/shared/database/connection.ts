import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite"
import { createTables, dropTables } from "./schema"

const DB_NAME = "bookteka.db"

let db: SQLiteDatabase | null = null
let currentUserId: string | null = null

export function setCurrentUserId(userId: string): void {
  currentUserId = userId
}

export function getCurrentUserId(): string | null {
  return currentUserId
}

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (db) return db

  db = await openDatabaseAsync(DB_NAME)

  // Ensure tables exist on first connection
  await createTables(db)

  return db
}

export async function clearDatabase(): Promise<void> {
  if (db) {
    await dropTables(db)
    await db.closeAsync()
    db = null
  }

  currentUserId = null
}

export async function resetDatabase(): Promise<void> {
  db = null
  await getDatabase()
}
