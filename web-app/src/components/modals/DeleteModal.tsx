import styles from "./DeleteModal.module.css";
import type { Book as BookType } from "@/types/book";
import { X } from "lucide-react";

interface DeleteModalProps {
  book: BookType;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const DeleteModal = ({ book, onClose, onDelete }: DeleteModalProps) => {
  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>¿Eliminar libro?</h2>
            <button className={styles.modalClose} onClick={onClose}>
              <X className={styles.modalCloseIcon} />
            </button>
          </div>
          <div className={styles.modalBody}>
            <p className={styles.modalDescription}>
              Se eliminará "{book.name}" junto con todos sus marcadores y
              progreso.
            </p>
          </div>
          <div className={styles.modalFooter}>
            <button className={styles.modalCancel} onClick={onClose}>
              Cancelar
            </button>
            <button
              className={styles.modalConfirm}
              onClick={() => {
                onDelete(book.id);
                onClose();
              }}
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
