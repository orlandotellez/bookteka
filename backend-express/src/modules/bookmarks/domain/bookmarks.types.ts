export interface CreateBookmarkInput {
  userId: string;
  userBookId: string;
  name: string;
  pageNumber: number;
  textPreview?: string;
}

/** Campos editables de un marcador existente. */
export interface UpdateBookmarkInput {
  name?: string;
  textPreview?: string | null;
}


/** Payload que acepta `POST /books/:bookId/bookmarks`. */
export interface CreateBookmarkRequestDTO {
  name: string;
  pageNumber: number;
  textPreview?: string;
}

/** Params de las rutas de marcadores. */
export interface GetBookmarkParams {
  bookId: string;
}

export interface CreateBookmarkParams {
  bookId: string;
}

export interface DeleteBookmarkParams {
  bookId: string;
}
