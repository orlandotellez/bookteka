import type { Book } from "@/types/book";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export const uploadBook = async (formData: FormData) => {
  try {
    const response = await fetch(`${API_URL}/books/upload`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Error al subir el libro al servidor");
    }

    const book: Book = await response.json();

    const id = book.id

    return id
  } catch {
    console.error("Error al subir el libro")
    throw new Error("UPLOAD_FAILED");
  }
}

export const downloadBook = async (bookId: string) => {
  try {
    const response = await fetch(
      `${API_URL}/books/${bookId}/download`,
      {
        credentials: "include"
      }
    );

    if (!response.ok) throw new Error("No se pudo obtener el enlace");

    const { url } = await response.json();

    return url
  } catch {
    console.error("Error al descargar el libro")
    throw new Error("DOWNLOAD_FAILED");

  }
}

export const deleteBookInCloud = async (bookId: string) => {
  try {
    const response = await fetch(`${API_URL}/books/${bookId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Error al eliminar el libro del servidor");
    }
  } catch {
    console.error("Error al eliminar el libro")
    throw new Error("DELETE_FAILED");
  }
}

export const updateBookProgress = async (
  bookId: string,
  data: {
    readingTimeSeconds?: number;
    scrollPosition?: number;
    lastReadAt?: number;
  }
) => {
  try {
    const response = await fetch(`${API_URL}/books/${bookId}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Error al actualizar el progreso");
    }
    return await response.json();
  } catch {
    console.error("Error al actualizar el progreso en el servidor");
    throw new Error("UPDATE_PROGRESS_FAILED");
  }
}
