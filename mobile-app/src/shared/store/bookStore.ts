import { create } from "zustand"
import * as FileSystem from "expo-file-system"

import type { Book, Bookmark, Highlight } from "@/shared/types/book"
import {
  getAllBooks,
  getBookById as getBookFromDB,
  addBook as saveBookToDB,
  updateBook,
  deleteBook as deleteBookFromDB,
  getBookmarksByBook,
  addBookmark as saveBookmarkToDB,
  removeBookmark as deleteBookmarkFromDB,
  getHighlightsByBook,
  addHighlight as saveHighlightToDB,
  removeHighlight as deleteHighlightFromDB,
} from "@/shared/database"
import {
  deleteBookInCloud,
  uploadBook,
  updateBookProgress,
  getSignedDownloadUrl,
} from "@/shared/api/book"
import { createBookmark } from "@/shared/api/bookmark"
import { syncBooksFromCloud } from "@/shared/api/sync"
import { ENV } from "../constants/env"

// Pure JS UUID v4 — no depende de crypto nativo (no disponible en Hermes)
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

type View = "library" | "reader" | "profile"

interface BookStore {
  // State
  books: Book[]
  isLoading: boolean
  error: string | null
  showUploader: boolean
  currentView: View
  currentBook: Book | null
  isSyncing: boolean
  isProcessingPdf: boolean
  pdfProgress: number
  downloadingBookId: string | null
  uploadingBookId: string | null

  // Book CRUD
  loadBooks: () => Promise<void>
  syncBooks: () => Promise<void>
  addBook: (book: Book) => Promise<Book>
  deleteBook: (id: string) => Promise<void>
  getBookById: (id: string) => Promise<Book | null>

  // Reading actions
  updateReadingTime: (bookId: string, seconds: number) => Promise<void>
  setReadingTime: (bookId: string, totalSeconds: number) => Promise<void>
  updateScrollPosition: (bookId: string, position: number) => Promise<void>

  // Bookmark actions
  loadBookmarks: (bookId: string) => Promise<Bookmark[]>
  addBookmark: (bookmark: Bookmark) => Promise<Bookmark>
  removeBookmark: (id: string) => Promise<void>

  // Highlight actions
  loadHighlights: (bookId: string) => Promise<Highlight[]>
  addHighlight: (highlight: Highlight) => Promise<void>
  removeHighlight: (id: string) => Promise<void>

  // Cloud sync
  uploadBookToCloud: (bookId: string) => Promise<void>
  downloadBookFromCloud: (bookId: string) => Promise<void>
  syncBookToCloud: (bookId: string) => Promise<void>

  // UI actions
  setCurrentView: (view: View) => void
  setCurrentBook: (book: Book | null) => void
  setShowUploader: (show: boolean) => void
  setPdfProgress: (progress: number) => void
  clearError: () => void
}

export const useBookStore = create<BookStore>((set, get) => ({
  // Initial state
  books: [],
  isLoading: false,
  error: null,
  showUploader: false,
  currentView: "library",
  currentBook: null,
  isSyncing: false,
  isProcessingPdf: false,
  pdfProgress: 0,
  downloadingBookId: null,
  uploadingBookId: null,

  // ─── Book CRUD ───────────────────────────────────────────

  loadBooks: async () => {
    set({ isLoading: true, error: null })
    try {
      const loadedBooks = await getAllBooks()
      set({ books: loadedBooks, isLoading: false })
    } catch (error) {
      console.error("Error loading books:", error)
      set({ error: "Error al cargar los libros", isLoading: false })
    }
  },

  syncBooks: async () => {
    set({ isSyncing: true, error: null })
    try {
      // Step 1: Fetch cloud books and merge with local data
      await syncBooksFromCloud()

      // Step 2: Upload any local books that aren't synced yet
      const localBooks = await getAllBooks()
      for (const localBook of localBooks) {
        if (!localBook.isSynced && localBook.fileUri) {
          try {
            const response = await uploadBook(
              localBook.fileUri,
              localBook.name.replace(/\.pdf$/i, ""),
            )

            const cloudId = response.id
            // Remove old local entry and re-insert with cloud ID
            await deleteBookFromDB(localBook.id)
            const updatedBook: Book = {
              ...localBook,
              id: cloudId,
              text: response.text || localBook.text || "",
              totalPages: response.totalPages || localBook.totalPages,
              isSynced: true,
            }
            await saveBookToDB(updatedBook)
          } catch (uploadError) {
            console.warn(
              `No se pudo subir "${localBook.name}" durante sync:`,
              uploadError,
            )
            // Continue with other books even if one fails
          }
        }
      }

      // Step 3: Reload books from local DB
      const loadedBooks = await getAllBooks()
      set({ books: loadedBooks, isSyncing: false })
    } catch (error) {
      console.error("Error syncing books:", error)
      set({ error: "Error al sincronizar libros", isSyncing: false })
    }
  },

  addBook: async (book: Book): Promise<Book> => {
    const bookToSave: Book = {
      ...book,
      id: book.id || generateUUID(),
      createdAt: book.createdAt || Date.now(),
      lastReadAt: book.lastReadAt || Date.now(),
      readingTimeSeconds: book.readingTimeSeconds ?? 0,
      scrollPosition: book.scrollPosition ?? 0,
    }

    try {
      await saveBookToDB(bookToSave)
      set((state) => ({ books: [bookToSave, ...state.books] }))
      return bookToSave
    } catch (error) {
      console.error("Error adding book:", error)
      set({ error: "Error al añadir el libro" })
      throw error
    }
  },

  deleteBook: async (id: string) => {
    try {
      if (!id) return

      // If synced to cloud, delete from cloud first
      const book = get().books.find((b) => b.id === id)
      if (book?.isSynced) {
        try {
          await deleteBookInCloud(id)
        } catch (cloudError) {
          console.error("Error deleting from cloud:", cloudError)
          // Continue with local deletion even if cloud fails
        }
      }

      // Delete from local DB (cascade removes bookmarks + highlights)
      await deleteBookFromDB(id)
      set((state) => ({
        books: state.books.filter((book) => book.id !== id),
      }))
    } catch (error) {
      console.error("Error deleting book:", error)
      set({ error: "Error al eliminar el libro" })
      throw error
    }
  },

  getBookById: async (id: string): Promise<Book | null> => {
    try {
      const book = await getBookFromDB(id)
      if (!book) return null

      // Phase 3: handle PDF download + processing here if needed
      // Phase 5: cloud download

      return book
    } catch (error) {
      console.error("Error getting book:", error)
      set({ error: "Error al obtener el libro" })
      return null
    }
  },

  // ─── Reading Actions ─────────────────────────────────────

  updateReadingTime: async (bookId: string, seconds: number) => {
    try {
      const book = await getBookFromDB(bookId)
      if (!book) return

      const newTime = (book.readingTimeSeconds ?? 0) + seconds
      await updateBook({ id: bookId, readingTimeSeconds: newTime, lastReadAt: Date.now() })

      set((state) => ({
        books: state.books.map((b) =>
          b.id === bookId ? { ...b, readingTimeSeconds: newTime, lastReadAt: Date.now() } : b,
        ),
      }))

      // Sync to cloud if the book is synced
      const currentBook = get().books.find((b) => b.id === bookId)
      if (currentBook?.isSynced) {
        updateBookProgress(bookId, {
          readingTimeSeconds: newTime,
          lastReadAt: Date.now(),
        }).catch((err) => console.error("Error syncing reading time to cloud:", err))
      }
    } catch (error) {
      console.error("Error updating reading time:", error)
      set({ error: "Error al actualizar tiempo de lectura" })
    }
  },

  setReadingTime: async (bookId: string, totalSeconds: number) => {
    try {
      await updateBook({ id: bookId, readingTimeSeconds: totalSeconds, lastReadAt: Date.now() })

      set((state) => ({
        books: state.books.map((b) =>
          b.id === bookId ? { ...b, readingTimeSeconds: totalSeconds, lastReadAt: Date.now() } : b,
        ),
      }))

      // Sync to cloud if the book is synced
      const currentBook = get().books.find((b) => b.id === bookId)
      if (currentBook?.isSynced) {
        updateBookProgress(bookId, {
          readingTimeSeconds: totalSeconds,
          lastReadAt: Date.now(),
        }).catch((err) => console.error("Error syncing reading time to cloud:", err))
      }
    } catch (error) {
      console.error("Error setting reading time:", error)
      set({ error: "Error al establecer tiempo de lectura" })
    }
  },

  updateScrollPosition: async (bookId: string, position: number) => {
    try {
      await updateBook({ id: bookId, scrollPosition: position, lastReadAt: Date.now() })

      set((state) => ({
        books: state.books.map((b) =>
          b.id === bookId ? { ...b, scrollPosition: position, lastReadAt: Date.now() } : b,
        ),
      }))

      // Sync to cloud if the book is synced
      const currentBook = get().books.find((b) => b.id === bookId)
      if (currentBook?.isSynced) {
        updateBookProgress(bookId, {
          scrollPosition: position,
          lastReadAt: Date.now(),
        }).catch((err) => console.error("Error syncing scroll position to cloud:", err))
      }
    } catch (error) {
      console.error("Error updating scroll position:", error)
      set({ error: "Error al actualizar posición" })
    }
  },

  // ─── Bookmark Actions ────────────────────────────────────

  loadBookmarks: async (bookId: string) => {
    try {
      return await getBookmarksByBook(bookId)
    } catch (error) {
      console.error("Error loading bookmarks:", error)
      return []
    }
  },

  addBookmark: async (bookmark: Bookmark): Promise<Bookmark> => {
    try {
      const bmToSave: Bookmark = {
        ...bookmark,
        id: bookmark.id || generateUUID(),
        createdAt: bookmark.createdAt || Date.now(),
      }

      await saveBookmarkToDB(bmToSave)

      // Sync to cloud if the book is synced
      const book = get().books.find((b) => b.id === bookmark.bookId)
      if (book?.isSynced) {
        try {
          const serverBm = await createBookmark(bookmark.bookId, {
            name: bookmark.name,
            pageNumber: bookmark.pageNumber,
            textPreview: bookmark.textPreview,
          })

          // Replace local bookmark with server version (correct ID)
          const syncedBookmark: Bookmark = {
            ...bmToSave,
            id: serverBm.id,
            userId: serverBm.userId,
          }
          await deleteBookmarkFromDB(bmToSave.id)
          await saveBookmarkToDB(syncedBookmark)

          return syncedBookmark
        } catch (apiError) {
          // If sync fails, bookmark still exists locally
          console.error("Error syncing bookmark to cloud:", apiError)
        }
      }

      return bmToSave
    } catch (error) {
      console.error("Error adding bookmark:", error)
      set({ error: "Error al añadir marcador" })
      throw error
    }
  },

  removeBookmark: async (id: string) => {
    try {
      await deleteBookmarkFromDB(id)
    } catch (error) {
      console.error("Error removing bookmark:", error)
      set({ error: "Error al eliminar marcador" })
      throw error
    }
  },

  // ─── Highlight Actions ───────────────────────────────────

  loadHighlights: async (bookId: string) => {
    try {
      return await getHighlightsByBook(bookId)
    } catch (error) {
      console.error("Error loading highlights:", error)
      return []
    }
  },

  addHighlight: async (highlight: Highlight) => {
    try {
      await saveHighlightToDB(highlight)
    } catch (error) {
      console.error("Error adding highlight:", error)
      set({ error: "Error al añadir resaltado" })
      throw error
    }
  },

  removeHighlight: async (id: string) => {
    try {
      await deleteHighlightFromDB(id)
    } catch (error) {
      console.error("Error removing highlight:", error)
      set({ error: "Error al eliminar resaltado" })
      throw error
    }
  },

  // ─── Cloud Sync Actions ─────────────────────────────────

  /**
   * Upload a specific book from local storage to the cloud.
   * 1. Get book from local DB
   * 2. If book has fileUri, upload the PDF using api/book.ts uploadBook
   * 3. On success, mark book as isSynced = true
   * 4. Handle error states
   */
  uploadBookToCloud: async (bookId: string) => {
    try {
      const book = await getBookFromDB(bookId)
      if (!book) {
        throw new Error("Libro no encontrado")
      }

      if (!book.fileUri) {
        throw new Error("El libro no tiene archivo local para subir")
      }

      set({ uploadingBookId: bookId })

      // Upload the PDF file to the server
      const response = await uploadBook(
        book.fileUri,
        book.name.replace(/\.pdf$/i, ""),
      )

      const cloudId = response.id

      // Remove old local entry (ID changes when uploaded to cloud)
      await deleteBookFromDB(book.id)


      const updatedBook: Book = {
        ...book,
        id: cloudId,
        // Preserve server-extracted text if returned
        text: response.text || book.text || "",
        totalPages: response.totalPages || book.totalPages,
        fileUrl: `${ENV.API_URL}/books/${cloudId}/stream`,
        isSynced: true,
      }

      await saveBookToDB(updatedBook)

      set((state) => ({
        books: state.books.map((b) =>
          b.id === bookId ? updatedBook : b,
        ),
        uploadingBookId: null,
      }))
    } catch (error) {
      console.error("Error uploading book to cloud:", error)
      set({
        error: "Error al subir el libro a la nube",
        uploadingBookId: null,
      })
      throw error
    }
  },

  /**
   * Download a book's PDF from the cloud to local storage.
   * 1. Get book from local DB (must have fileUrl from cloud sync)
   * 2. Get signed download URL
   * 3. Download PDF to local filesystem
   * 4. Update fileUri in local DB
   * 5. Mark as synced
   */
  downloadBookFromCloud: async (bookId: string) => {
    try {
      const book = await getBookFromDB(bookId)
      if (!book) {
        throw new Error("Libro no encontrado")
      }

      if (!book.fileUrl && !book.fileKey) {
        throw new Error("El libro no tiene URL en la nube")
      }

      set({ downloadingBookId: bookId })

      // Get signed download URL
      let downloadUrl: string
      try {
        downloadUrl = await getSignedDownloadUrl(bookId)
      } catch {
        // Fall back to the fileUrl directly if signed URL fails
        if (!book.fileUrl) throw new Error("No se pudo obtener URL de descarga")
        downloadUrl = book.fileUrl
      }

      // Download PDF to local filesystem
      const localFileName = `${bookId}-${Date.now()}.pdf`
      const localFileUri = `${FileSystem.documentDirectory}${localFileName}`

      const downloadResult = await FileSystem.downloadAsync(downloadUrl, localFileUri)

      if (!downloadResult.uri) {
        throw new Error("Error al descargar el PDF")
      }

      // Update local book with fileUri
      const updatedBook: Book = {
        ...book,
        fileUri: downloadResult.uri,
        isSynced: true,
      }

      await updateBook(updatedBook)

      set((state) => ({
        books: state.books.map((b) =>
          b.id === bookId ? updatedBook : b,
        ),
        downloadingBookId: null,
      }))
    } catch (error) {
      console.error("Error downloading book from cloud:", error)
      set({
        error: "Error al descargar el libro desde la nube",
        downloadingBookId: null,
      })
      throw error
    }
  },

  /**
   * Manual sync for a single book.
   * - If book.isSynced → PATCH progress to the server
   * - If not synced → upload full book to cloud
   * - Update isSynced flag
   */
  syncBookToCloud: async (bookId: string) => {
    try {
      const book = get().books.find((b) => b.id === bookId)
      if (!book) {
        throw new Error("Libro no encontrado")
      }

      if (book.isSynced) {
        // Already synced → just update progress on server
        set({ uploadingBookId: bookId })

        await updateBookProgress(bookId, {
          readingTimeSeconds: book.readingTimeSeconds,
          scrollPosition: book.scrollPosition,
          lastReadAt: Date.now(),
        })

        set({ uploadingBookId: null })

        console.log(`Progreso sincronizado para "${book.name}"`)
      } else {
        // Not synced → upload full book
        await get().uploadBookToCloud(bookId)
      }
    } catch (error) {
      console.error("Error syncing book to cloud:", error)
      set({
        error: "Error al sincronizar el libro",
        uploadingBookId: null,
      })
      throw error
    }
  },

  // ─── UI Actions ──────────────────────────────────────────

  setCurrentView: (view: View) => set({ currentView: view }),
  setCurrentBook: (book: Book | null) => set({ currentBook: book }),
  setShowUploader: (show: boolean) => set({ showUploader: show }),
  setPdfProgress: (progress: number) => set({ pdfProgress: progress }),
  clearError: () => set({ error: null }),
}))
