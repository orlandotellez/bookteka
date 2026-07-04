import { useEffect, useRef, useState } from "react";
import { Bookmark, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import styles from "./BooksmarkPanel.module.css";
import type { Bookmark as BookmarkType, HighlightColor } from "@/types/book";

const COLOR_CLASS_MAP: Record<HighlightColor, string> = {
  yellow: styles.colorYellow,
  green: styles.colorGreen,
  blue: styles.colorBlue,
  pink: styles.colorPink,
  orange: styles.colorOrange,
};

interface BookmarksPanelProps {
  bookmarks: BookmarkType[];
  isOpen: boolean;
  onClose: () => void;
  onAddBookmark: (name: string) => void;
  onUpdateBookmark: (
    id: string,
    data: { name?: string; textPreview?: string },
  ) => Promise<BookmarkType | undefined>;
  onDeleteBookmark: (id: string) => void;
  onNavigateToBookmark: (bookmark: BookmarkType) => void;
}

export const BookmarksPanel = ({
  bookmarks,
  isOpen,
  onClose,
  onAddBookmark,
  onUpdateBookmark,
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
            Añadir marcador en esta página
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
            <BookmarkItem
              key={bookmark.id}
              bookmark={bookmark}
              onNavigate={() => onNavigateToBookmark(bookmark)}
              onUpdate={(data) => onUpdateBookmark(bookmark.id, data)}
              onDelete={() => onDeleteBookmark(bookmark.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface BookmarkItemProps {
  bookmark: BookmarkType;
  onNavigate: () => void;
  onUpdate: (
    data: { name?: string; textPreview?: string },
  ) => Promise<BookmarkType | undefined>;
  onDelete: () => void;
}

const BookmarkItem = ({
  bookmark,
  onNavigate,
  onUpdate,
  onDelete,
}: BookmarkItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(bookmark.name);
  const [editedPreview, setEditedPreview] = useState(bookmark.textPreview);
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Resetear el form cuando se abre la edición
  useEffect(() => {
    if (isEditing) {
      setEditedName(bookmark.name);
      setEditedPreview(bookmark.textPreview);
      // Foco en el input del nombre al abrir
      requestAnimationFrame(() => nameInputRef.current?.focus());
    }
  }, [isEditing, bookmark.name, bookmark.textPreview]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
    setEditedName(bookmark.name);
    setEditedPreview(bookmark.textPreview);
  };

  const handleSaveEdit = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    const trimmedName = editedName.trim();
    if (!trimmedName) return;
    if (isSaving) return;

    setIsSaving(true);
    try {
      const result = await onUpdate({
        name: trimmedName,
        textPreview: editedPreview.trim(),
      });
      if (result) {
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div
        className={`${styles.bookmarkItem} ${styles.bookmarkItemEditing}`}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className={`${styles.colorSwatch} ${COLOR_CLASS_MAP[bookmark.color] ?? COLOR_CLASS_MAP.yellow}`}
          aria-hidden="true"
        />
        <div className={styles.editForm}>
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Nombre del marcador"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit(e);
              if (e.key === "Escape") handleCancelEdit();
            }}
            className={styles.input}
            disabled={isSaving}
          />
          <textarea
            placeholder="Texto del marcador (opcional)"
            value={editedPreview}
            onChange={(e) => setEditedPreview(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") handleCancelEdit();
            }}
            className={styles.textarea}
            rows={3}
            disabled={isSaving}
          />
          <div className={styles.editActions}>
            <span className={styles.pageBadge}>Pág. {bookmark.pageNumber}</span>
            <div className={styles.editButtons}>
              <button
                type="button"
                className={styles.editCancelButton}
                onClick={handleCancelEdit}
                disabled={isSaving}
                aria-label="Cancelar"
              >
                <X size={14} />
              </button>
              <button
                type="button"
                className={styles.editSaveButton}
                onClick={handleSaveEdit}
                disabled={!editedName.trim() || isSaving}
                aria-label="Guardar cambios"
              >
                <Check size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.bookmarkItem}
      onClick={onNavigate}
    >
      <span
        className={`${styles.colorSwatch} ${COLOR_CLASS_MAP[bookmark.color] ?? COLOR_CLASS_MAP.yellow}`}
        title={`Color del marcador`}
        aria-hidden="true"
      />
      <div className={styles.bookmarkContent}>
        <div className={styles.bookmarkText}>
          <p className={styles.bookmarkName}>
            {bookmark.name}{" "}
            <span className={styles.pageBadge}>Pág. {bookmark.pageNumber}</span>
          </p>
          {bookmark.textPreview && (
            <p className={styles.preview}>"{bookmark.textPreview}..."</p>
          )}
          <p className={styles.date}>
            {new Date(bookmark.createdAt).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className={styles.itemActions}>
          <button
            className={styles.editButton}
            onClick={handleStartEdit}
            aria-label="Editar marcador"
            title="Editar marcador"
          >
            <Pencil size={14} color="#2563eb" />
          </button>
          <button
            className={styles.deleteButton}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Eliminar marcador"
            title="Eliminar marcador"
          >
            <Trash2 size={14} color="#dc3545" />
          </button>
        </div>
      </div>
    </div>
  );
};
