import { Highlighter, X } from "lucide-react";
import type { HighlightColor } from "@/types/book";
import styles from "./HighlightToolbar.module.css";

interface HighlightToolbarProps {
  onHighlight: (color: HighlightColor) => void;
  onClose: () => void;
  position: { x: number; y: number } | null;
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

const HighlightToolbar = ({
  onHighlight,
  onClose,
  position,
}: HighlightToolbarProps) => {
  if (!position) return null;

  return (
    <div
      className={styles.toolbar}
      style={{
        left: Math.min(position.x, window.innerWidth - 200),
        top: Math.max(position.y - 50, 10),
      }}
    >
      <Highlighter className={styles.icon} />

      {HIGHLIGHT_COLORS.map(({ color, className, label }) => (
        <button
          key={color}
          onClick={() => onHighlight(color)}
          className={`${styles.colorButton} ${styles[className]}`}
          aria-label={`Subrayar en ${label}`}
          title={label}
        />
      ))}

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

export default HighlightToolbar;
