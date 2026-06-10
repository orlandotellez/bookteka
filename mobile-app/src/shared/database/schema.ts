import type { SQLiteDatabase } from "expo-sqlite"

export async function createTables(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      userId TEXT,
      name TEXT NOT NULL,
      readingTimeSeconds INTEGER NOT NULL DEFAULT 0,
      scrollPosition INTEGER NOT NULL DEFAULT 0,
      lastReadAt INTEGER NOT NULL DEFAULT 0,
      text TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL DEFAULT 0,
      totalPages INTEGER,
      fileUri TEXT,
      fileUrl TEXT,
      fileKey TEXT,
      isSynced INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_books_userId ON books(userId);
    CREATE INDEX IF NOT EXISTS idx_books_lastRead ON books(lastReadAt);

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      userId TEXT,
      bookId TEXT NOT NULL,
      name TEXT NOT NULL,
      pageNumber INTEGER NOT NULL DEFAULT 0,
      textPreview TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bookmarks_bookId ON bookmarks(bookId);

    CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY,
      userId TEXT,
      bookId TEXT NOT NULL,
      text TEXT NOT NULL,
      color TEXT NOT NULL,
      paragraphIndex INTEGER NOT NULL DEFAULT 0,
      startOffset INTEGER NOT NULL DEFAULT 0,
      endOffset INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_highlights_bookId ON highlights(bookId);

    CREATE TABLE IF NOT EXISTS streaks (
      id TEXT PRIMARY KEY,
      userId TEXT,
      currentStreak INTEGER NOT NULL DEFAULT 0,
      startDate TEXT,
      lastActiveDate TEXT,
      hasCompletedToday INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_streaks_userId ON streaks(userId);

    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      userId TEXT,
      createdAt INTEGER NOT NULL DEFAULT 0,
      totalReadingTimeSeconds INTEGER NOT NULL DEFAULT 0
    );
  `)
}

export async function dropTables(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    DROP TABLE IF EXISTS user_profile;
    DROP TABLE IF EXISTS streaks;
    DROP TABLE IF EXISTS highlights;
    DROP TABLE IF EXISTS bookmarks;
    DROP TABLE IF EXISTS books;
  `)
}
