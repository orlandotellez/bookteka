import styles from "./EditTimeModal.module.css";
import { Clock, X } from "lucide-react";
import { useState, useEffect } from "react";
import { formatTime } from "@/utils/time";
import type { Book } from "@/types/book";

interface EditTimeModalProps {
  book: Book;
  onSave: (id: string, totalSeconds: number) => Promise<void>;
  onClose: () => void;
}

export const EditTimeModal = ({
  book,
  onSave,
  onClose,
}: EditTimeModalProps) => {
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [seconds, setSeconds] = useState("0");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const currentSeconds = book.readingTimeSeconds;
    const h = Math.floor(currentSeconds / 3600);
    const m = Math.floor((currentSeconds % 3600) / 60);
    const s = currentSeconds % 60;
    setHours(h.toString());
    setMinutes(m.toString());
    setSeconds(s.toString());
  }, [book.readingTimeSeconds]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const h = parseInt(hours, 10) || 0;
      const m = parseInt(minutes, 10) || 0;
      const s = parseInt(seconds, 10) || 0;
      const totalSeconds = h * 3600 + m * 60 + s;
      await onSave(book.id, totalSeconds);
      onClose();
    } catch (error) {
      console.error("Error saving time:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const totalPreview = () => {
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    const s = parseInt(seconds, 10) || 0;
    return h * 3600 + m * 60 + s;
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Editar tiempo de lectura</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.bookInfo}>
          <span className={styles.bookName}>
            {book.name.replace(".pdf", "")}
          </span>
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.inputWrapper}>
            <label>Horas</label>
            <input
              type="number"
              min="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.inputWrapper}>
            <label>Minutos</label>
            <input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.inputWrapper}>
            <label>Segundos</label>
            <input
              type="number"
              min="0"
              max="59"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.preview}>
          <Clock size={16} />
          <span>Tiempo total: {formatTime(totalPreview())}</span>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancelar
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
};
