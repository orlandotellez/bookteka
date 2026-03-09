export type BookStatus = "not_started" | "in_progress" | "completed";

export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "orange";

export interface Book {
  id: string;
  userId?: string;
  name: string;
  readingTimeSeconds: number;
  scrollPosition: number;
  lastReadAt: number;
  text: string;
  createdAt: number;
  totalPages?: number;
  fileBlob?: File;
  // Campos para sincronización con cloud
  fileUrl?: string;
  fileKey?: string;
  isSynced?: boolean; // true si está subido a la nube
}

export interface Bookmark {
  id: string;
  userId?: string;
  bookId: string;
  name: string;
  scrollPosition: number;
  textPreview: string;
  createdAt: number;
}

export interface Highlight {
  id: string;
  userId?: string;
  bookId: string;
  text: string;
  color: HighlightColor;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  createdAt: number;
}
