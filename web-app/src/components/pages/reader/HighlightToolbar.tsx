import { useState } from "react";
import { Highlighter, X, Bookmark, Check } from "lucide-react";
import type { HighlightColor } from "@/types/book";
import styles from "./HighlightToolbar.module.css";

interface HighlightToolbarProps {
  onHighlight: (color: HighlightColor) => void;
  onAddBookmark: (text: string) => void;
  onClose: () => void;
  position: { x: number; y: number } | null;
  selectedText?: string;
}

const HIGHLIGHT_COLORS: {
  color: HighlightColor;
  className: string;
  label: string;
}[] = [
  { color: "yellow", className: "yellow", label: "Amarillo" },
  { color: "green", className: "green", label: "Verde" },
  { color: "blue", className: "blue", label: "Azul" },
  { color: "pink", className: "pink", label: "Rosa" },
  { color: "orange", className: "orange", label: "Naranja" },
];

export const HighlightToolbar = ({
  onHighlight,
  onAddBookmark,
  onClose,
  position,
  selectedText = "",
}: HighlightToolbarProps) => {
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);
  const [bookmarkName, setBookmarkName] = useState("");
  const [selectedColor, setSelectedColor] = useState<HighlightColor>("yellow");

  if (!position) return null;

  const handleColorClick = (color: HighlightColor) => {
    if (isAddingBookmark) {
      setSelectedColor(color);
    } else {
      // Modo normal: solo subrayar
      onHighlight(color);
    }
  };

  const handleBookmarkClick = () => {
    setIsAddingBookmark(true);
  };

  const handleConfirmBookmark = () => {
    if (!bookmarkName.trim()) return;

    // Primero subrayar con el color seleccionado
    onHighlight(selectedColor);
    // Luego crear marcador con el nombre y el texto seleccionado
    onAddBookmark(bookmarkName.trim() + "|||" + selectedText);
    // Cerrar toolbar
    onClose();
  };

  const handleCancelBookmark = () => {
    setIsAddingBookmark(false);
    setBookmarkName("");
  };

  // modo agregando marcador
  if (isAddingBookmark) {
    return (
      <div
        className={styles.toolbar}
        style={{
          left: Math.min(position.x, window.innerWidth - 320),
          top: Math.max(position.y - 50, 10),
        }}
      >
        <input
          type="text"
          placeholder="Nombre del marcador"
          value={bookmarkName}
          onChange={(e) => setBookmarkName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirmBookmark()}
          className={styles.bookmarkInput}
          autoFocus
        />

        <div className={styles.colorPicker}>
          {HIGHLIGHT_COLORS.map(({ color, className, label }) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`${styles.colorButton} ${styles[className]} ${
                selectedColor === color ? styles.selected : ""
              }`}
              aria-label={`Color ${label}`}
              title={label}
            />
          ))}
        </div>

        <button
          className={styles.confirmButton}
          onClick={handleConfirmBookmark}
          disabled={!bookmarkName.trim()}
          aria-label="Confirmar"
        >
          <Check size={16} />
        </button>

        <button
          className={styles.closeButton}
          onClick={handleCancelBookmark}
          aria-label="Cancelar"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // modo normal
  return (
    <div
      className={styles.toolbar}
      style={{
        left: Math.min(position.x, window.innerWidth - 280),
        top: Math.max(position.y - 50, 10),
      }}
    >
      <Highlighter className={styles.icon} />

      {HIGHLIGHT_COLORS.map(({ color, className, label }) => (
        <button
          key={color}
          onClick={() => handleColorClick(color)}
          className={`${styles.colorButton} ${styles[className]}`}
          aria-label={`Subrayar en ${label}`}
          title={label}
        />
      ))}

      <div className={styles.divider} />

      <button
        className={styles.bookmarkButton}
        onClick={handleBookmarkClick}
        aria-label="Agregar marcador"
        title="Agregar marcador y subrayar"
      >
        <Bookmark className={styles.icon} />
      </button>

      <button
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Cerrar"
      >
        <X className={styles.icon} />
      </button>
    </div>
  );
};
