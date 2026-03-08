import type { Book } from "@/types/book";

const API_URL = import.meta.env.VITE_API_URL;

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

export const deleteBookInCloud = async (id: string) => {
  try {
    const response = await fetch(`${API_URL}/books/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Error al eliminar el libro del servidor");
    }
  } catch {
    console.error("Error al subir el libro")
    throw new Error("UPLOAD_FAILED");
  }
}
