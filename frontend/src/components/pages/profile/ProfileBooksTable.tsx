import { useState } from "react";
import {
  TrendingUp,
  Cloud,
  CloudOff,
  CloudDownload,
  CloudUpload,
  Edit2,
} from "lucide-react";
import type { Book } from "@/types/book";
import { formatTime } from "@/utils/time";
import { Spinner } from "@/components/common/Spinner";
import { Pagination } from "@/components/pages/index/Pagination";
import { useUserPreferences } from "@/store/userPreferencesStore";
import { isCloudAvailable } from "@/lib/cloud";
import styles from "./ProfileBooksTable.module.css";

const BOOKS_PER_PAGE = 10;

interface ProfileBooksTableProps {
  books: Book[];
  uploadingBookId?: string | null;
  onEditTime?: (book: Book) => void;
  onUpload?: (bookId: string) => void;
  onDownload: (bookId: string, fileName: string) => void;
}

const ProfileBooksTable = ({
  books,
  uploadingBookId,
  onEditTime,
  onUpload,
  onDownload,
}: ProfileBooksTableProps) => {
  const [booksPage, setBooksPage] = useState(1);
  const cloudAvailable = isCloudAvailable(useUserPreferences((s) => s.authMode));

  // Orden por tiempo de lectura (mayor a menor)
  const booksByReadingTime = [...books].sort(
    (a, b) => b.readingTimeSeconds - a.readingTimeSeconds,
  );

  // Paginación de la sección "Todos los libros" (10 por página)
  const totalBookPages = Math.max(
    1,
    Math.ceil(booksByReadingTime.length / BOOKS_PER_PAGE),
  );
  const currentBooksPage = Math.min(booksPage, totalBookPages);
  const pagedBooks = booksByReadingTime.slice(
    (currentBooksPage - 1) * BOOKS_PER_PAGE,
    currentBooksPage * BOOKS_PER_PAGE,
  );

  if (books.length === 0) {
    return (
      <div className={styles.empty}>
        Aún no tienes libros. ¡Añade uno para empezar!
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.sectionTitle}>
        <TrendingUp size={18} color="var(--font-color-title)" />
        Todos los libros
        <span className={styles.totalCount}>{books.length}</span>
      </h2>

      {pagedBooks.map((book, index) => (
        <div key={book.id} className={styles.bookRow}>
          <span className={styles.index}>
            {(currentBooksPage - 1) * BOOKS_PER_PAGE + index + 1}
          </span>

          <div className={styles.bookName}>{book.name.replace(".pdf", "")}</div>

          <span className={styles.time}>
            {formatTime(book.readingTimeSeconds)}
          </span>

          {/* Indicador de sync + Botón acción */}
          <div className={styles.cloudActions}>
            {/* Indicador visual */}
            <div
              className={styles.syncBadge}
              title={book.isSynced ? "Sincronizado en la nube" : "Solo en este dispositivo"}
            >
              {book.isSynced ? (
                <Cloud size={14} color="var(--secondary-color)" />
              ) : (
                <CloudOff size={14} color="var(--font-color-text)" />
              )}
            </div>

            {/* Botón acción: descargar si está en nube, subir si no.
                En modo local no hay backend, así que no se ofrece. */}
            <div className={styles.actionButtons}>
              {!cloudAvailable ? null : book.isSynced ? (
                <button
                  onClick={() => onDownload(book.id, book.name)}
                  className={styles.actionButton}
                  title="Descargar PDF"
                >
                  <CloudDownload size={18} color="var(--secondary-color)" />
                </button>
              ) : (
                <button
                  onClick={() => onUpload?.(book.id)}
                  className={styles.actionButton}
                  disabled={!!uploadingBookId}
                  title={uploadingBookId ? "Subiendo..." : "Subir a la nube"}
                >
                  {uploadingBookId === book.id ? (
                    <Spinner />
                  ) : (
                    <CloudUpload size={18} color="#f97316" />
                  )}
                </button>
              )}
            </div>
          </div>

          <button
            className={styles.iconButton}
            onClick={() => onEditTime?.(book)}
          >
            <Edit2 size={16} color="var(--font-color-title)" />
          </button>
        </div>
      ))}

      <Pagination
        currentPage={currentBooksPage}
        totalPages={totalBookPages}
        totalItems={booksByReadingTime.length}
        itemsPerPage={BOOKS_PER_PAGE}
        onPageChange={setBooksPage}
      />
    </div>
  );
};

export default ProfileBooksTable;
