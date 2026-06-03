export interface CreateBookmarkInput {
  userId: string;
  userBookId: string;
  name: string;
  pageNumber: number;
  textPreview?: string;
}

