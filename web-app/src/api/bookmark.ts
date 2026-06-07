const API_URL = import.meta.env.VITE_API_URL || "/api";

export interface CreateBookmarkPayload {
  name: string;
  pageNumber: number;
  textPreview?: string;
}

export interface BookmarkResponse {
  id: string;
  userId: string;
  userBookId: string;
  name: string;
  pageNumber: number;
  textPreview: string | null;
  createdAt: string;
}

export const createBookmark = async (
  bookId: string,
  data: CreateBookmarkPayload,
): Promise<BookmarkResponse> => {
  const response = await fetch(`${API_URL}/books/${bookId}/bookmarks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Error al crear marcador");
  }

  return response.json();
};

export const getBookmarks = async (
  bookId: string,
): Promise<BookmarkResponse[]> => {
  const response = await fetch(`${API_URL}/books/${bookId}/bookmarks`, {
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Error al obtener marcadores");
  }

  return response.json();
};

export const deleteBookmark = async (
  bookId: string,
  bookmarkId: string,
): Promise<void> => {
  const response = await fetch(
    `${API_URL}/books/${bookId}/bookmarks/${bookmarkId}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Error al eliminar marcador");
  }
};
