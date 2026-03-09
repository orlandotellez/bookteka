import { Book, Trash2, Clock, ChevronRight, Cloud, CloudOff } from "lucide-react";
import { useState } from "react";
import { formatTime } from "@/utils/time";
import type { Book as BookType } from "@/types/book";
import styles from "./CardBookList.module.css";
import { DeleteModal } from "@/components/modals/DeleteModal";
import { Spinner } from "@/components/common/Spinner";

interface BookListItemProps {
  book: BookType;
  onOpen: (book: BookType) => void;
  onDelete: (id: string) => void;
  isDownloading?: boolean;
  downloadProgress?: number;
}

export const CardBookList = ({ 
  book, 
  onOpen, 
  onDelete, 
  isDownloading, 
  downloadProgress,
}: BookListItemProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const lastRead = new Date(book.lastReadAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });

  const progress = isDownloading
    ? "Descargando..."
    : book.scrollPosition > 0 ? "En progreso" : "Sin empezar";

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleClick = () => {
    if (!isDownloading) {
      onOpen(book);
    }
  };

  return (
    <div className={`${styles.card} ${isDownloading ? styles.cardDownloading : ""}`} onClick={handleClick}>
      <div className={styles.iconWrapper}>
        {isDownloading ? (
          <Spinner />
        ) : (
          <Book className={styles.icon} />
        )}
      </div>

      <div className={styles.titleWrapper}>
        <h3 className={styles.title}>
          {book.name.replace(".pdf", "")}
          {isDownloading && downloadProgress !== undefined && (
            <span className={styles.downloadingProgress}> ({Math.round(downloadProgress)}%)</span>
          )}
        </h3>
      </div>

      <div className={styles.meta}>
        {!isDownloading && (
          <span className={styles.metaItem}>
            <Clock className={styles.metaIcon} />
            {formatTime(book.readingTimeSeconds)}
          </span>
        )}
        <span
          className={`${styles.badge} ${isDownloading ? styles.badgeDownloading : book.scrollPosition > 0 ? styles.badgeActive : styles.badgeInactive}`}
        >
          {progress}
        </span>
        {!isDownloading && <span>{lastRead}</span>}
      </div>

      {!isDownloading && (
        <button
          className={styles.deleteButton}
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
        >
          <Trash2 className={styles.deleteIcon} />
        </button>
      )}

      {/* Indicador de sincronización */}
      <div className={styles.syncIndicator} title={book.isSynced ? "Sincronizado en la nube" : "Solo en este dispositivo"}>
        {book.isSynced ? (
          <Cloud size={16} color="var(--secondary-color)" />
        ) : (
          <CloudOff size={16} color="var(--font-color-text)" />
        )}
      </div>

      {!isDownloading && <ChevronRight className={styles.chevron} />}

      {isModalOpen && (
        <DeleteModal book={book} onClose={closeModal} onDelete={onDelete} />
      )}
    </div>
  );
};
