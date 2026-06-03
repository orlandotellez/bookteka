export interface UserBookResponse {
  id: string;
  title: string;
  author: string;
  createdAt: number;        // timestamp (getTime)
  lastReadAt: number;       // timestamp
  readingTimeSeconds: number;
  scrollPosition: number;
  totalPages?: number;      // opcional porque lo pusiste undefined
  fileUrl: string;
  fileKey: string;
}

export interface UploadBookResponseDTO {
  bookId: string;
  userBookId: string;
}

export interface DeleteBookResponseDTO {
  success: boolean;
  message: string;
  auditId: string;
}
