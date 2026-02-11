export type BookStatus = "not_started" | "in_progress" | "completed";

export interface Book {
  id: string;
  name: string;
  readingTimeSeconds: number;
  scrollPosition: number;
  lastReadAt: number;
  text: string;
  createdAt: number;
  lastReadAt: number;
  readingTimeSeconds: number;
  scrollPosition: number;
  totalPages?: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  name: string;
  scrollPosition: number;
  textPreview: string;
  createdAt: number;
}

export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "orange";

export interface Highlight {
  id: string;
  bookId: string;
  text: string;
  color: HighlightColor;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  createdAt: number;
}
