import { useState } from "react";
import { Book as BookIcon, Trash2, Clock } from "lucide-react";
import styles from "./CardBook.module.css";
import type { Book } from "@/types/book";

import { formatTime } from "@/utils/time";
import { DeleteModal } from "../modals/DeleteModal";

interface BookCardProps {
  book: Book;
  onOpen: (book: Book) => void;
  onDelete: (id: string) => void;
}

export const CardBook = ({ book, onOpen, onDelete }: BookCardProps) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const lastRead = new Date(book.lastReadAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const progress = book.scrollPosition > 0 ? "En progreso" : "Sin empezar";

  const closeModal = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <BookIcon size={22} color="#df8052" />
          </div>

          <div className={styles.content}>
            <h3 className={styles.title} title={book.name}>
              {book.name.replace(".pdf", "")}
            </h3>

            <div>
              <div className={styles.meta}>
                <span className={styles.metaItem}>
                  <Clock size={14} />
                  {formatTime(book.readingTimeSeconds)}
                </span>
                <span>•</span>
                <span>{progress}</span>
              </div>

              <p className={styles.lastRead}>Última lectura: {lastRead}</p>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={() => onOpen(book)}>
            {book.scrollPosition > 0 ? "Continuar leyendo" : "Empezar a leer"}
          </button>

          <button
            className={styles.deleteButton}
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 size={16} color="var(--font-color-title)" />
          </button>
        </div>
      </div>

      {showConfirm && (
        <DeleteModal book={book} onClose={closeModal} onDelete={onDelete} />
      )}
    </>
  );
};
