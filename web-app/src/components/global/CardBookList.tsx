import { Book, Trash2, Clock, ChevronRight } from "lucide-react";
import { useState } from "react";
import { formatTime } from "@/utils/time";
import type { Book as BookType } from "@/types/book";
import styles from "./CardBookList.module.css";
import { DeleteModal } from "../modals/DeleteModal";

interface BookListItemProps {
  book: BookType;
  onOpen: (book: BookType) => void;
  onDelete: (id: string) => void;
}

export const CardBookList = ({ book, onOpen, onDelete }: BookListItemProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const lastRead = new Date(book.lastReadAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });

  const progress = book.scrollPosition > 0 ? "En progreso" : "Sin empezar";

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className={styles.card} onClick={() => onOpen(book)}>
      <div className={styles.iconWrapper}>
        <Book className={styles.icon} />
      </div>

      <div className={styles.titleWrapper}>
        <h3 className={styles.title}>{book.name.replace(".pdf", "")}</h3>
      </div>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <Clock className={styles.metaIcon} />
          {formatTime(book.readingTimeSeconds)}
        </span>
        <span
          className={`${styles.badge} ${book.scrollPosition > 0 ? styles.badgeActive : styles.badgeInactive}`}
        >
          {progress}
        </span>
        <span>{lastRead}</span>
      </div>

      <button
        className={styles.deleteButton}
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
      >
        <Trash2 className={styles.deleteIcon} />
      </button>

      <ChevronRight className={styles.chevron} />

      {isModalOpen && (
        <DeleteModal book={book} onClose={closeModal} onDelete={onDelete} />
      )}
    </div>
  );
};
