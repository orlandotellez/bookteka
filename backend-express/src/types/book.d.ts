export interface Book {
  id: string;
  title: string;
  author?: string | null;
  fileUrl: string;
  fileKey: string;
  fileHash: string;
  size?: number | null;
  createdAt: Date;

  userBooks?: UserBook[];
}

export interface UserBook {
  id: string;

  userId: string;
  bookId: string;

  currentPage: number;
  scrollPosition: number;
  readingTimeSeconds: number;
  lastReadAt?: Date | null;

  createdAt: Date;

  book?: Book;
  bookmarks?: Bookmark[];
}

export interface Bookmark {
  id: string;

  userId: string;
  userBookId: string;

  name?: string | null;
  pageNumber: number;
  textPreview?: string | null;

  createdAt: Date;

  userBook?: UserBook;
}

export interface UploadBookInput {
  userId: string;
  file: Express.Multer.File;
  body: {
    title?: string;
    author?: string;
    readingTimeSeconds?: string;
    scrollPosition?: string;
  };
}

export interface CreateBookInput {
  title: string;
  author: string;
  fileKey: string;
  fileUrl: string;
  fileHash: string;
  size: number;
}

export interface UpsertUserBookInput {
  userId: string;
  bookId: string;
  readingTimeSeconds: number;
  scrollPosition: number;
}

export interface DeleteBookInput {
  userId: string;
  bookId: string;
}

export interface UpdateBookProgressInput {
  userId: string;
  bookId: string;
  body: {
    readingTimeSeconds?: number;
    scrollPosition?: number;
    lastReadAt?: Date;
  };
}

export interface DownloadBookInput {
  userId: string;
  bookId: string;
}

export interface StreamBookInput {
  userId: string;
  bookId: string;
}
