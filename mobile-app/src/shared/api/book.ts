import { File, UploadType } from "expo-file-system"
import { ENV } from "../constants/env"


// ─── Types ─────────────────────────────────────────────────────────────────

export interface BookProgressData {
  readingTimeSeconds?: number
  scrollPosition?: number
  lastReadAt?: number
}

export interface UploadBookResponse {
  id: string
  bookId?: string
  text?: string
  totalPages?: number
  name?: string
}

export async function uploadBook(
  fileUri: string,
  title?: string,
): Promise<UploadBookResponse> {
  try {
    const params: Record<string, string> = {}
    if (title) params.title = title

    const file = new File(fileUri)
    const result = await file.upload(`${ENV.API_URL}/books/upload`, {
      httpMethod: "POST",
      uploadType: UploadType.MULTIPART,
      fieldName: "file",
      parameters: params,
    })

    if (result.status !== 200) {
      throw new Error("Error al subir el libro al servidor")
    }

    const data = JSON.parse(result.body)
    return {
      id: data.bookId || data.id,
      text: data.text,
      totalPages: data.totalPages,
      name: data.name,
    }
  } catch (error) {
    console.error("Error al subir el libro:", error)
    throw new Error("UPLOAD_FAILED")
  }
}

export async function downloadBookUrl(bookId: string): Promise<string> {
  try {
    const response = await fetch(`${ENV.API_URL}/books/${bookId}/download`, {
      credentials: "include",
    })

    if (!response.ok) throw new Error("No se pudo obtener el enlace")

    const { url } = await response.json()
    return url
  } catch (error) {
    console.error("Error al descargar el libro:", error)
    throw new Error("DOWNLOAD_FAILED")
  }
}

export async function deleteBookInCloud(bookId: string): Promise<void> {
  try {
    const response = await fetch(`${ENV.API_URL}/books/${bookId}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error || "Error al eliminar el libro del servidor",
      )
    }
  } catch (error) {
    console.error("Error al eliminar el libro:", error)
    throw new Error("DELETE_FAILED")
  }
}

export async function updateBookProgress(
  bookId: string,
  data: BookProgressData,
) {
  try {
    const response = await fetch(`${ENV.API_URL}/books/${bookId}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("Error al actualizar el progreso")
    }

    return await response.json()
  } catch (error) {
    console.error("Error al actualizar el progreso en el servidor:", error)
    throw new Error("UPDATE_PROGRESS_FAILED")
  }
}

export async function getSignedDownloadUrl(bookId: string): Promise<string> {
  try {
    const response = await fetch(`${ENV.API_URL}/books/${bookId}/download`, {
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("Error al obtener URL de descarga")
    }

    const data = await response.json()
    return data.url
  } catch (error) {
    console.error("Error al obtener URL de descarga:", error)
    throw new Error("GET_SIGNED_URL_FAILED")
  }
}
