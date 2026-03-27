import type { Book, Bookmark, Highlight } from "@/types/book";
import type { UserProfile } from "@/types/user";
import type { StreakData } from "@/types/reading";
export type { StreakData };

export type { Book, Bookmark, Highlight, UserProfile };

// Esquema de la base de datos IndexedDB
export interface ReaderDBSchema {
  books: {
    key: string;
    value: Book;
    indexes: { "by-lastRead": number; "by-userId": string };
  };
  bookmarks: {
    key: string;
    value: Bookmark;
    indexes: { "by-bookId": string; "by-userId": string };
  };
  highlights: {
    key: string;
    value: Highlight;
    indexes: { "by-bookId": string; "by-userId": string };
  };
  userProfile: {
    key: string;
    value: UserProfile;
  };
  streaks: {
    key: string;
    value: StreakData;
  };
}

export const DB_NAME = "bookteka-db";
export const DB_VERSION = 4;
