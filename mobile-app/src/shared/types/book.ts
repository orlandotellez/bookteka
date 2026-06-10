export type BookStatus = "not_started" | "in_progress" | "completed"
export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "orange"

export interface Book {
  id: string
  userId?: string
  name: string
  readingTimeSeconds: number
  scrollPosition: number
  lastReadAt: number
  text: string
  createdAt: number
  totalPages?: number
  fileUri?: string    // RN: fileUri instead of fileBlob
  fileUrl?: string
  fileKey?: string
  isSynced?: boolean
}

export interface Bookmark {
  id: string
  userId?: string
  bookId: string
  name: string
  pageNumber: number
  textPreview: string
  createdAt: number
}

export interface Highlight {
  id: string
  userId?: string
  bookId: string
  text: string
  color: HighlightColor
  paragraphIndex: number
  startOffset: number
  endOffset: number
  createdAt: number
}
