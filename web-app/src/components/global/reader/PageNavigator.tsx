import { useState, useEffect, useCallback, forwardRef } from "react";
import { ChevronLeft, ChevronRight, List, X, Maximize2, Minimize } from "lucide-react";
import styles from "./PageNavigator.module.css";

interface PageMarker {
  paragraphIndex: number;
  pageNumber: number;
}

interface PageNavigatorProps {
  currentPage: number;
  totalPages: number;
  pageMarkers: PageMarker[];
  onNavigateToPage: (pageNumber: number) => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export const PageNavigator = forwardRef<HTMLDivElement, PageNavigatorProps>(({
  currentPage,
  totalPages,
  onNavigateToPage,
  isZenMode = false,
  onToggleZenMode
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      onNavigateToPage(currentPage - 1);
    }
  }, [currentPage, onNavigateToPage]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      onNavigateToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, onNavigateToPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && e.altKey) {
        e.preventDefault();
        goToPreviousPage();
      } else if (e.key === "ArrowRight" && e.altKey) {
        e.preventDefault();
        goToNextPage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPreviousPage, goToNextPage]);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <>
      {!isZenMode ? (
        <>
          <button
            className={styles.zenModeButton}
            onClick={onToggleZenMode}
            aria-label="Activar de Zen Mode"
          >
            <Minimize size={16} color="var(--font-color-title)" />
          </button>

          {/* Botón flotante */}
          <button
            className={`${styles.toggleButton} ${isOpen ? styles.toggleShift : ""
              }`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navegación"
          >
            {isOpen ? (
              <X size={16} color="var(--font-color-title)" />
            ) : (
              <List size={16} color="var(--font-color-title)" />
            )}
          </button>


          {/* Indicador de página */}
          <div className={styles.pageIndicator}>
            <button
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              className={styles.iconButton}
            >
              <ChevronLeft size={16} color="var(--font-color-title)" />
            </button>

            <span className={styles.pageText}>
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className={styles.iconButton}
            >
              <ChevronRight size={16} color="var(--font-color-title)" />
            </button>
          </div>

        </>
      ) : (
        <>
          {/* Botón Zen Mode */}
          <button
            className={styles.zenModeToggle}
            onClick={onToggleZenMode}
            title="Salir Zen Mode"
          >
            <Maximize2 size={16} color="var(--font-color-title)" />
          </button>

        </>
      )}

      {/* Panel lateral */}
      <div
        ref={ref}
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarHeader}>
          <h2>Páginas</h2>
          <p>{totalPages} páginas en total</p>
        </div>

        <div className={styles.pageList}>
          {pages.map((pageNumber) => (
            <button
              key={pageNumber}
              onClick={() => {
                onNavigateToPage(pageNumber);
                setIsOpen(false);
              }}
              className={`${styles.pageItem} ${currentPage === pageNumber ? styles.pageItemActive : ""
                }`}
            >
              Página {pageNumber}
              {currentPage === pageNumber && (
                <span className={styles.badge}>Actual</span>
              )}
            </button>
          ))}
        </div>

        <div className={styles.footer}>Alt + ← / → para navegar</div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)} />
      )}
    </>
  );
},
);
