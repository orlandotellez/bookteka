import { useMemo, useState } from "react";
import { Clock, BookOpen, Trash2 } from "lucide-react";
import styles from "./BookShelfView.module.css";
import type { Book } from "@/database";


interface BookShelfViewProps {
  books: Book[];
  onOpen: (book: Book) => Promise<void>;
  onDelete: (id: string) => void;
}

const BOOK_COLORS = [
  { cover: "hsl(16, 55%, 42%)", spine: "hsl(16, 55%, 35%)", accent: "hsl(45, 70%, 65%)" },
  { cover: "hsl(145, 40%, 32%)", spine: "hsl(145, 40%, 25%)", accent: "hsl(45, 70%, 70%)" },
  { cover: "hsl(220, 50%, 38%)", spine: "hsl(220, 50%, 30%)", accent: "hsl(45, 65%, 65%)" },
  { cover: "hsl(35, 55%, 40%)", spine: "hsl(35, 55%, 32%)", accent: "hsl(40, 40%, 90%)" },
  { cover: "hsl(340, 45%, 38%)", spine: "hsl(340, 45%, 30%)", accent: "hsl(45, 70%, 70%)" },
  { cover: "hsl(180, 35%, 33%)", spine: "hsl(180, 35%, 26%)", accent: "hsl(45, 65%, 65%)" },
  { cover: "hsl(270, 35%, 38%)", spine: "hsl(270, 35%, 30%)", accent: "hsl(45, 70%, 70%)" },
  { cover: "hsl(25, 60%, 38%)", spine: "hsl(25, 60%, 30%)", accent: "hsl(40, 50%, 85%)" },
  { cover: "hsl(0, 50%, 35%)", spine: "hsl(0, 50%, 28%)", accent: "hsl(45, 70%, 70%)" },
  { cover: "hsl(200, 40%, 35%)", spine: "hsl(200, 40%, 28%)", accent: "hsl(45, 65%, 65%)" },
];

function getBookColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BOOK_COLORS[Math.abs(hash) % BOOK_COLORS.length];
}

function getBookThickness(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 3) - hash);
  return 40 + (Math.abs(hash) % 30);
}

function getBookHeight(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 4) - hash);
  return 200 + (Math.abs(hash) % 30);
}

function formatTime(seconds: number) {
  if (seconds < 60) return "< 1 min";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m} min`;
}

function truncateTitle(name: string, maxLen: number) {
  const clean = name.replace(/\.pdf$/i, "");
  return clean.length > maxLen ? clean.slice(0, maxLen) + "…" : clean;
}

const ShelfBook = ({
  book,
  onOpen,
  onDelete,
}: {
  book: Book;
  onOpen: (book: Book) => void;
  onDelete: (id: string) => void;
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const color = getBookColor(book.name);
  const thickness = getBookThickness(book.name);
  const height = getBookHeight(book.name);
  const isReading = book.scrollPosition > 0;
  const title = truncateTitle(book.name, 24);

  return (
    <div
      className={styles.bookWrapper}
      style={{ width: thickness, height }}
    >
      <button
        onClick={() => onOpen(book)}
        className={styles.bookButton}
      >
        <div
          className={styles.book}
          style={{ backgroundColor: color.cover }}
        >
          <div className={styles.title} style={{ color: color.accent }}>
            {title}
          </div>

          {isReading && <div className={styles.progress} />}

          <div
            className={styles.spine}
            style={{
              background: `linear-gradient(to right, ${color.spine}, #eee)`,
            }}
          />
        </div>
      </button>

      {/* Tooltip */}
      <div className={styles.tooltip}>
        <p className={styles.tooltipTitle}>
          {book.name.replace(/\.pdf$/i, "")}
        </p>

        <div className={styles.tooltipInfo}>
          <div><Clock size={12} /> {formatTime(book.readingTimeSeconds)}</div>
          <div><BookOpen size={12} /> {isReading ? "En progreso" : "Sin empezar"}</div>
        </div>

        <div className={styles.tooltipActions}>
          <span>Abrir</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmOpen(true);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Modal */}
      {confirmOpen && (
        <div className={styles.modalOverlay} onClick={() => setConfirmOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>¿Eliminar libro?</h3>
            <p>{book.name}</p>

            <div className={styles.modalActions}>
              <button onClick={() => setConfirmOpen(false)}>Cancelar</button>
              <button
                className={styles.deleteBtn}
                onClick={() => {
                  onDelete(book.id);
                  setConfirmOpen(false);
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BookShelfView = ({ books, onOpen, onDelete }: BookShelfViewProps) => {
  const shelves = useMemo(() => {
    const result: Book[][] = [];
    const perShelf = Math.max(5, Math.min(10, Math.ceil(books.length / Math.ceil(books.length / 8))));
    for (let i = 0; i < books.length; i += perShelf) {
      result.push(books.slice(i, i + perShelf));
    }
    if (result.length === 0) result.push([]);
    return result;
  }, [books]);

  return (
    <div className={styles.container}>
      {shelves.map((shelfBooks, idx) => (
        <div key={idx} className={styles.shelfUnit}>
          <div className={styles.booksRow}>
            {shelfBooks.map((book) => (
              <ShelfBook
                key={book.id}
                book={book}
                onOpen={onOpen}
                onDelete={onDelete}
              />
            ))}
          </div>
          <div className={styles.shelf} />
        </div>
      ))}
    </div>
  );
};

export default BookShelfView;
