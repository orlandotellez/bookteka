import { useState } from "react";
import { Bookmark, Plus, Trash2, X } from "lucide-react";
import styles from "./BooksmarkPanel.module.css";
import type { Bookmark as BookmarkType } from "@/types/book";

interface BookmarksPanelProps {
  bookmarks: BookmarkType[];
  isOpen: boolean;
  onClose: () => void;
  onAddBookmark: (name: string) => void;
  onDeleteBookmark: (id: string) => void;
  onNavigateToBookmark: (bookmark: BookmarkType) => void;
}

export const BookmarksPanel = ({
  bookmarks,
  isOpen,
  onClose,
  onAddBookmark,
  onDeleteBookmark,
  onNavigateToBookmark,
}: BookmarksPanelProps) => {
  const [newBookmarkName, setNewBookmarkName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddBookmark = () => {
    if (newBookmarkName.trim()) {
      onAddBookmark(newBookmarkName.trim());
      setNewBookmarkName("");
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Bookmark size={20} />
          <h2>Marcadores</h2>
        </div>
        <button className={styles.iconButton} onClick={onClose}>
          <X size={16} color="var(--font-color-title)" />
        </button>
      </div>

      {/* Añadir marcador */}
      <div className={styles.addSection}>
        {isAdding ? (
          <div className={styles.addForm}>
            <input
              type="text"
              placeholder="Nombre del marcador"
              value={newBookmarkName}
              onChange={(e) => setNewBookmarkName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBookmark()}
              autoFocus
              className={styles.input}
            />
            <button className={styles.saveButton} onClick={handleAddBookmark}>
              Guardar
            </button>
          </div>
        ) : (
          <button
            className={styles.addButton}
            onClick={() => setIsAdding(true)}
          >
            <Plus size={16} />
            Añadir marcador aquí
          </button>
        )}
      </div>

      {/* Lista */}
      <div className={styles.list}>
        {bookmarks.length === 0 ? (
          <p className={styles.empty}>
            No hay marcadores todavía.
            <br />
            Añade uno para guardar tu progreso.
          </p>
        ) : (
          bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className={styles.bookmarkItem}
              onClick={() => onNavigateToBookmark(bookmark)}
            >
              <div className={styles.bookmarkContent}>
                <div className={styles.bookmarkText}>
                  <p className={styles.bookmarkName}>{bookmark.name}</p>
                  <p className={styles.preview}>"{bookmark.textPreview}..."</p>
                  <p className={styles.date}>
                    {new Date(bookmark.createdAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <button
                  className={styles.deleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteBookmark(bookmark.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
