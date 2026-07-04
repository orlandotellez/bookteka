import React, { useMemo, useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from "react";
import type { ReadingSettings } from "./ReadingControls";
import type { Bookmark, Highlight, HighlightColor } from "@/types/book";
import { HighlightToolbar } from "./HighlightToolbar";
import { PageNavigator } from "./PageNavigator";
import { trailingDebounce } from "@/utils/debounce";
import styles from "./TextReader.module.css";

export interface TextReaderHandle {
  navigateToPage: (pageNumber: number) => void;
}

interface TextReaderProps {
  text: string;
  settings: ReadingSettings;
  highlights: Highlight[];
  bookmarks?: Bookmark[];
  initialScrollPosition?: number;
  totalPages?: number;
  onScrollPositionChange?: (position: number) => void;
  onAddHighlight?: (
    text: string,
    color: HighlightColor,
    paragraphIndex: number,
    startOffset: number,
    endOffset: number,
  ) => void;
  onRemoveHighlight?: (id: string) => void;
  onAddBookmark?: (text: string) => void;
  onPageChange?: (page: number) => void;
  showPageNavigator?: boolean;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

const HIGHLIGHT_CLASS_MAP: Record<HighlightColor, string> = {
  yellow: styles.highlightYellow,
  green: styles.highlightGreen,
  blue: styles.highlightBlue,
  pink: styles.highlightPink,
  orange: styles.highlightOrange,
};

const BOOKMARK_CLASS_MAP: Record<HighlightColor, string> = {
  yellow: styles.bookmarkYellow,
  green: styles.bookmarkGreen,
  blue: styles.bookmarkBlue,
  pink: styles.bookmarkPink,
  orange: styles.bookmarkOrange,
};

// Fuente map 
const FONT_FAMILY_MAP: Record<string, string> = {
  serif: '"Crimson Pro", serif',
  serifAlt: '"Merriweather", serif',
  sans: '"Inter", sans-serif',
  sansAlt: '"Open Sans", sans-serif',
};

const Paragraph = React.memo<{
  paragraph: string;
  highlights: Highlight[];
  HIGHLIGHT_CLASS_MAP: Record<HighlightColor, string>;
  onRemoveHighlight?: (id: string) => void;
}>(({ paragraph, highlights, HIGHLIGHT_CLASS_MAP, onRemoveHighlight }) => {
  if (highlights.length === 0) {
    return <>{paragraph}</>;
  }

  const sortedHighlights = [...highlights].sort(
    (a, b) => a.startOffset - b.startOffset,
  );

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  sortedHighlights.forEach((h) => {
    if (h.startOffset > lastEnd) {
      parts.push(
        <span key={`text-${lastEnd}`}>
          {paragraph.slice(lastEnd, h.startOffset)}
        </span>,
      );
    }

    parts.push(
      <mark
        key={h.id}
        className={`${styles.highlight} ${HIGHLIGHT_CLASS_MAP[h.color]}`}
        data-highlight-id={h.id}
        onClick={() => onRemoveHighlight?.(h.id)}
        title="Click para eliminar subrayado"
      >
        {paragraph.slice(h.startOffset, h.endOffset)}
      </mark>,
    );

    lastEnd = h.endOffset;
  });

  if (lastEnd < paragraph.length) {
    parts.push(
      <span key={`text-end-${lastEnd}`}>{paragraph.slice(lastEnd)}</span>,
    );
  }

  return <>{parts}</>;
});

Paragraph.displayName = "Paragraph";

export const TextReader = forwardRef<TextReaderHandle, TextReaderProps>(({
  text,
  settings,
  highlights,
  bookmarks = [],
  initialScrollPosition = 0,
  totalPages,
  onScrollPositionChange,
  onAddHighlight,
  onRemoveHighlight,
  onAddBookmark,
  onPageChange,
  showPageNavigator = true,
  isZenMode = false,
  onToggleZenMode,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRestoredPosition = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selection, setSelection] = useState<any>(null);
  const noop = useCallback(() => { }, []);

  const onScrollPositionChangeRef = useRef(onScrollPositionChange);
  const onPageChangeRef = useRef(onPageChange);
  useEffect(() => {
    onScrollPositionChangeRef.current = onScrollPositionChange;
    onPageChangeRef.current = onPageChange;
  }, [onScrollPositionChange, onPageChange]);

  const latestScrollYRef = useRef(0);

  const scrollNotifyDebouncedRef = useRef<ReturnType<
    typeof trailingDebounce<[number]>
  > | null>(null);
  if (scrollNotifyDebouncedRef.current === null) {
    scrollNotifyDebouncedRef.current = trailingDebounce<[number]>((y) => {
      onScrollPositionChangeRef.current?.(y);
    }, 2500);
  }

  // Aplicar estilos directamente al DOM sin causar re-renders
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--reader-font-size", `${settings.fontSize}px`);
    root.style.setProperty("--reader-line-height", String(settings.lineHeight));
    root.style.setProperty(
      "--reader-font-family",
      FONT_FAMILY_MAP[settings.fontFamily] || FONT_FAMILY_MAP.sans
    );
    root.style.setProperty("--reader-width", `${settings.textWidth}%`);
  }, [settings.fontSize, settings.lineHeight, settings.fontFamily, settings.textWidth]);

  // Limpiar estilos al desmontar
  useEffect(() => {
    return () => {
      const root = document.documentElement;
      root.style.removeProperty("--reader-font-size");
      root.style.removeProperty("--reader-line-height");
      root.style.removeProperty("--reader-font-family");
      root.style.removeProperty("--reader-width");
    };
  }, []);

  const { paragraphs, pageMarkers } = useMemo(() => {
    const rawParagraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const markers: { paragraphIndex: number; pageNumber: number }[] = [];
    const cleanParagraphs: string[] = [];

    rawParagraphs.forEach((p) => {
      const pageMatch = p.match(/^\[PAGE_(\d+)\]\s*/);
      if (pageMatch) {
        const pageNum = parseInt(pageMatch[1]);
        markers.push({
          paragraphIndex: cleanParagraphs.length,
          pageNumber: pageNum,
        });
        const cleanText = p.replace(/^\[PAGE_\d+\]\s*/, "").trim();
        if (cleanText) cleanParagraphs.push(cleanText);
      } else {
        cleanParagraphs.push(p);
      }
    });

    return { paragraphs: cleanParagraphs, pageMarkers: markers };
  }, [text]);

  const highlightsByParagraph = useMemo(() => {
    const map: Record<number, Highlight[]> = {};
    highlights.forEach((h) => {
      if (!map[h.paragraphIndex]) {
        map[h.paragraphIndex] = [];
      }
      map[h.paragraphIndex].push(h);
    });
    return map;
  }, [highlights]);

  // Agrupa marcadores por número de página para poder renderizarlos
  // al inicio de la página correspondiente.
  const bookmarksByPage = useMemo(() => {
    const map: Record<number, Bookmark[]> = {};
    bookmarks.forEach((b) => {
      if (!map[b.pageNumber]) {
        map[b.pageNumber] = [];
      }
      map[b.pageNumber].push(b);
    });
    return map;
  }, [bookmarks]);

  // Marcadores de página efectivos: si el PDF no trae tokens [PAGE_X],
  // generamos uno sintético dividiendo los párrafos均匀 entre totalPages
  // para que el separador visual funcione también en esos libros.
  const effectivePageMarkers = useMemo(() => {
    if (pageMarkers.length > 0 || !totalPages || totalPages <= 1 || paragraphs.length === 0) {
      return pageMarkers;
    }
    // Si hay menos párrafos que páginas declaradas, no apilamos markers
    // en el mismo paragraphIndex (evita N dividers sobre el primer párrafo).
    const pagesCount = Math.min(totalPages, paragraphs.length);
    if (pagesCount <= 1) return pageMarkers;
    const perPage = Math.max(1, Math.ceil(paragraphs.length / pagesCount));
    const synthetic: { paragraphIndex: number; pageNumber: number }[] = [];
    for (let i = 0; i < pagesCount; i++) {
      synthetic.push({
        paragraphIndex: Math.min(i * perPage, paragraphs.length - 1),
        pageNumber: i + 1,
      });
    }
    return synthetic;
  }, [pageMarkers, totalPages, paragraphs.length]);

  useEffect(() => {
    if (
      containerRef.current &&
      initialScrollPosition > 0 &&
      !hasRestoredPosition.current
    ) {
      window.scrollTo(0, initialScrollPosition);
      hasRestoredPosition.current = true;
    }
  }, [initialScrollPosition]);

  // Detectar selección de texto
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelection(null);
        return;
      }

      const selectedText = sel.toString().trim();
      if (selectedText.length < 3) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const paragraphElement =
        range.startContainer.parentElement?.closest("[data-index]");

      if (paragraphElement) {
        const paragraphIndex = parseInt(
          paragraphElement.getAttribute("data-index") || "0",
        );
        const paragraphText = paragraphs[paragraphIndex];

        if (paragraphText) {
          // Calcular offsets relativos al párrafo completo
          // (range.startOffset/endOffset son relativos al text node individual)
          const preRange = document.createRange();
          preRange.selectNodeContents(paragraphElement);

          preRange.setEnd(range.startContainer, range.startOffset);
          const paraStartOffset = preRange.toString().length;

          preRange.selectNodeContents(paragraphElement);
          preRange.setEnd(range.endContainer, range.endOffset);
          const paraEndOffset = preRange.toString().length;

          const rect = range.getBoundingClientRect();

          setSelection({
            text: selectedText,
            paragraphIndex,
            startOffset: paraStartOffset,
            endOffset: paraEndOffset,
            position: {
              x: rect.left,
              y: rect.top - 10,
            },
          });
        }
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [paragraphs]);

  // Detectar página actual según el scroll.
  //
  // El feedback visual (currentPage/onPageChange) sigue siendo sincrónico
  // para que la UI responda pixel-perfect. La notificación al padre
  // (`onScrollPositionChange`) está debounced a 2.5s para colapsar el
  // storm de PATCH que se disparaba con cada evento de scroll nativo.
  // El listener ya no depende de `onScrollPositionChange`/`onPageChange`
  // porque usamos refs arriba para re-bind sin re-attach.
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      latestScrollYRef.current = scrollY;
      const viewportHeight = window.innerHeight;
      const scrollCenter = scrollY + viewportHeight / 2;

      const paraElements = containerRef.current?.querySelectorAll("[data-index]");
      if (!paraElements) return;

      let currentParagraphIndex = 0;
      for (let i = 0; i < paraElements.length; i++) {
        const paragraph = paraElements[i] as HTMLElement;
        const rect = paragraph.getBoundingClientRect();
        const paragraphTop = rect.top + window.scrollY;

        if (paragraphTop > scrollCenter) break;
        currentParagraphIndex = i;
      }

      let currentPageFromScroll = 1;
      for (const marker of effectivePageMarkers) {
        if (currentParagraphIndex >= marker.paragraphIndex) {
          currentPageFromScroll = marker.pageNumber;
        } else {
          break;
        }
      }

      if (effectivePageMarkers.length === 0 && totalPages) {
        const scrollProgress = Math.min(
          scrollY / (document.body.scrollHeight - viewportHeight),
          1,
        );
        currentPageFromScroll = Math.max(
          1,
          Math.ceil(scrollProgress * totalPages),
        );
      }

      setCurrentPage(currentPageFromScroll);

      onPageChangeRef.current?.(currentPageFromScroll);

      scrollNotifyDebouncedRef.current?.call(scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [effectivePageMarkers, totalPages]);

  // Flush del debouncer cuando la pestaña se oculta o se cierra.
  // Sin esto, si el usuario deja de scrollear justo antes de cerrar,
  // los últimos 2.5s de posición podrían no llegar al backend.
  //
  // Solo invocamos flush(): el debouncer ya retiene los últimos args
  // (= la última scrollY conocida). Si no hay args pendientes (porque
  // ya pasaron >2.5s desde el último scroll y el debouncer ya disparó)
  // flush es no-op, que es el comportamiento correcto — esa posición
  // ya fue enviada al store y, eventualmente, al cloud.
  useEffect(() => {
    const flushNow = () => {
      scrollNotifyDebouncedRef.current?.flush();
    };

    const handlePageHide = () => flushNow();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushNow();
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Flush también al desmontar el componente (cambio a library, navegación
  // con React Router, etc.). Tener un `useEffect` separado con cleanup nos
  // garantiza flush incluso si el tab NO se oculta (ej. SPA navigation).
  useEffect(() => {
    return () => {
      scrollNotifyDebouncedRef.current?.flush();
    };
  }, []);

  const handleAddHighlight = useCallback(
    (color: HighlightColor) => {
      if (!selection || !onAddHighlight) return;

      onAddHighlight(
        selection.text,
        color,
        selection.paragraphIndex,
        selection.startOffset,
        selection.endOffset,
      );

      window.getSelection()?.removeAllRanges();
      setSelection(null);
    },
    [selection, onAddHighlight],
  );

  const handleNavigateToPage = useCallback(
    (pageNumber: number) => {
      const targetMarker = effectivePageMarkers.find(
        (marker) => marker.pageNumber === pageNumber,
      );

      if (targetMarker) {
        const targetParagraph = containerRef.current?.querySelector(
          `[data-index="${targetMarker.paragraphIndex}"]`,
        );
        if (targetParagraph) {
          targetParagraph.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      } else if (effectivePageMarkers.length === 0 && totalPages) {
        const scrollProgress = (pageNumber - 1) / totalPages;
        const targetScrollY =
          scrollProgress * (document.body.scrollHeight - window.innerHeight);
        window.scrollTo({ top: targetScrollY, behavior: "smooth" });
      }
    },
    [effectivePageMarkers, totalPages],
  );

  // Exponer navigateToPage para que el Reader pueda navegar desde bookmarks
  useImperativeHandle(ref, () => ({
    navigateToPage: handleNavigateToPage,
  }), [handleNavigateToPage]);

  return (
    <div ref={containerRef} className={styles.readerContainer}>
      <article className={styles.article}>
        <div className={styles.readerContent}>
          {paragraphs.map((paragraph, index) => {
            // Detectar marcadores de inicio de página para esta posición
            const pageStartsAtThisParagraph = effectivePageMarkers.filter(
              (m) => m.paragraphIndex === index,
            );
            // Nada que separar antes de la primera página: no pintar divider.
            const isFirstPage = pageStartsAtThisParagraph.some(
              (m) => m.pageNumber === 1,
            );
            const showDivider =
              pageStartsAtThisParagraph.length > 0 && !isFirstPage;
            const seenPageNumbers = new Set<number>();
            const pageBookmarks = pageStartsAtThisParagraph.flatMap((m) => {
              if (seenPageNumbers.has(m.pageNumber)) return [];
              seenPageNumbers.add(m.pageNumber);
              return bookmarksByPage[m.pageNumber] ?? [];
            });

            return (
              <React.Fragment key={index}>
                {showDivider && (
                  <div
                    className={styles.pageDivider}
                    data-page={pageStartsAtThisParagraph[0].pageNumber}
                    aria-label={`Inicio de la página ${pageStartsAtThisParagraph[0].pageNumber}`}
                  >
                    <span className={styles.pageDividerLabel} aria-hidden="true">
                      Página {pageStartsAtThisParagraph[0].pageNumber}
                    </span>

                    {pageBookmarks.length > 0 && (
                      <div className={styles.bookmarkMarkerRow}>
                        {pageBookmarks.map((bm) => (
                          <span
                            key={bm.id}
                            className={`${styles.bookmarkMarker} ${BOOKMARK_CLASS_MAP[bm.color] ?? BOOKMARK_CLASS_MAP.yellow}`}
                            title={`Marcador: ${bm.name} · Página ${bm.pageNumber}`}
                            aria-label={`Marcador ${bm.name} en la página ${bm.pageNumber}`}
                          >
                            <span className={styles.bookmarkDot} aria-hidden="true" />
                            <span className={styles.bookmarkName}>{bm.name}</span>
                            <span className={styles.bookmarkPage} aria-hidden="true">pág. {bm.pageNumber}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p
                  data-index={index}
                  className={styles.paragraph}
                  onMouseUp={() => {
                    setTimeout(() => {
                      const sel = window.getSelection();
                      if (sel && !sel.isCollapsed) {
                        // selectionchange handles the rest
                      }
                    }, 10);
                  }}
                >
                  <Paragraph
                    paragraph={paragraph}
                    highlights={highlightsByParagraph[index] || []}
                    HIGHLIGHT_CLASS_MAP={HIGHLIGHT_CLASS_MAP}
                    onRemoveHighlight={onRemoveHighlight}
                  />
                </p>
              </React.Fragment>
            );
          })}
        </div>
      </article>

      {showPageNavigator && paragraphs.length > 0 && (
        <PageNavigator
          currentPage={currentPage}
          totalPages={totalPages || effectivePageMarkers.length || 1}
          pageMarkers={effectivePageMarkers}
          onNavigateToPage={handleNavigateToPage}
          isZenMode={isZenMode}
          onToggleZenMode={onToggleZenMode}
        />
      )}

      {selection && onAddHighlight && (
        <HighlightToolbar
          position={selection.position}
          selectedText={selection.text}
          onHighlight={handleAddHighlight}
          onAddBookmark={onAddBookmark || noop}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
});
