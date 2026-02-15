import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import type { ReadingSettings } from "./ReadingControls";
import type { Highlight, HighlightColor } from "@/types/book";
import { HighlightToolbar } from "./HighlightToolbar";
import PageNavigator from "./PageNavigator";
import styles from "./TextReader.module.css";

interface TextReaderProps {
  text: string;
  settings: ReadingSettings;
  highlights: Highlight[];
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
  onAddBookmark?: (text: string) => void;
  showPageNavigator?: boolean;
}

const HIGHLIGHT_CLASS_MAP: Record<HighlightColor, string> = {
  yellow: styles.highlightYellow,
  green: styles.highlightGreen,
  blue: styles.highlightBlue,
  pink: styles.highlightPink,
  orange: styles.highlightOrange,
};

export const TextReader = ({
  text,
  settings,
  highlights,
  initialScrollPosition = 0,
  totalPages,
  onScrollPositionChange,
  onAddHighlight,
  onAddBookmark,
  showPageNavigator = true,
}: TextReaderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRestoredPosition = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selection, setSelection] = useState<any>(null);

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

  const containerStyle = {
    maxWidth: `${settings.textWidth}%`,
  };

  const textStyle = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
  };

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
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelection(null);
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length < 3) {
        setSelection(null);
        return;
      }

      // Encontrar el párrafo y posición de la selección
      const range = selection.getRangeAt(0);
      const paragraphElement =
        range.startContainer.parentElement?.closest("[data-index]");

      if (paragraphElement) {
        const paragraphIndex = parseInt(
          paragraphElement.getAttribute("data-index") || "0",
        );
        const paragraphText = paragraphs[paragraphIndex];

        if (paragraphText) {
          const startOffset = range.startOffset;
          const endOffset = range.endOffset;

          // Obtener posición del cursor para mostrar toolbar
          const rect = range.getBoundingClientRect();

          setSelection({
            text: selectedText,
            paragraphIndex,
            startOffset,
            endOffset,
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

  // Detectar página actual según el scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const scrollCenter = scrollY + viewportHeight / 2;

      // Encontrar qué párrafo está en el centro de la pantalla
      const paragraphs = containerRef.current?.querySelectorAll("[data-index]");
      if (!paragraphs) return;

      let currentParagraphIndex = 0;
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i] as HTMLElement;
        const rect = paragraph.getBoundingClientRect();
        const paragraphTop = rect.top + window.scrollY;

        if (paragraphTop > scrollCenter) break;
        currentParagraphIndex = i;
      }

      // Calcular página actual basada en el párrafo actual
      let currentPageFromScroll = 1;
      for (const marker of pageMarkers) {
        if (currentParagraphIndex >= marker.paragraphIndex) {
          currentPageFromScroll = marker.pageNumber;
        } else {
          break;
        }
      }

      // Si no hay pageMarkers, calcular basado en la posición
      if (pageMarkers.length === 0 && totalPages) {
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

      // Notificar cambio de posición de scroll
      if (onScrollPositionChange) {
        onScrollPositionChange(scrollY);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Calcular página inicial

    return () => window.removeEventListener("scroll", handleScroll);
  }, [pageMarkers, totalPages, onScrollPositionChange]);

  const renderParagraphWithHighlights = useCallback(
    (paragraph: string, index: number) => {
      const paragraphHighlights = highlightsByParagraph[index] || [];

      if (paragraphHighlights.length === 0) return paragraph;

      const sortedHighlights = [...paragraphHighlights].sort(
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

        const highlightText = paragraph.slice(
          h.startOffset,
          h.startOffset + h.text.length,
        );

        parts.push(
          <mark
            key={h.id}
            className={`${styles.highlight} ${HIGHLIGHT_CLASS_MAP[h.color]}`}
          >
            {highlightText}
          </mark>,
        );

        lastEnd = h.startOffset + h.text.length;
      });

      if (lastEnd < paragraph.length) {
        parts.push(
          <span key={`text-end-${lastEnd}`}>{paragraph.slice(lastEnd)}</span>,
        );
      }

      return parts;
    },
    [highlightsByParagraph],
  );

  // Manejar highlight
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

      // Limpiar selección y toolbar
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    },
    [selection, onAddHighlight],
  );

  // Navegar a página específica
  const handleNavigateToPage = useCallback(
    (pageNumber: number) => {
      // Encontrar el pageMarker para la página solicitada
      const targetMarker = pageMarkers.find(
        (marker) => marker.pageNumber === pageNumber,
      );

      if (targetMarker) {
        // Navegar al párrafo específico
        const targetParagraph = containerRef.current?.querySelector(
          `[data-index="${targetMarker.paragraphIndex}"]`,
        );
        if (targetParagraph) {
          targetParagraph.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      } else if (pageMarkers.length === 0 && totalPages) {
        // Navegar basado en porcentaje si no hay pageMarkers
        const scrollProgress = (pageNumber - 1) / totalPages;
        const targetScrollY =
          scrollProgress * (document.body.scrollHeight - window.innerHeight);
        window.scrollTo({ top: targetScrollY, behavior: "smooth" });
      }
    },
    [pageMarkers, totalPages],
  );

  return (
    <div ref={containerRef} className={styles.readerContainer}>
      <article className={styles.article} style={containerStyle}>
        <div
          className={`${styles.readerContent} ${settings.fontFamily}`}
          style={textStyle}
        >
          {paragraphs.map((paragraph, index) => (
            <p
              key={index}
              data-index={index}
              className={styles.paragraph}
              onMouseUp={() => {
                // Dar tiempo a que la selección se complete
                setTimeout(() => {
                  const selection = window.getSelection();
                  if (selection && !selection.isCollapsed) {
                    // El evento selectionchange se encargará del resto
                  }
                }, 10);
              }}
            >
              {renderParagraphWithHighlights(paragraph, index)}
            </p>
          ))}
        </div>
      </article>

      {showPageNavigator && paragraphs.length > 0 && (
        <PageNavigator
          currentPage={currentPage}
          totalPages={totalPages || pageMarkers.length || 1}
          pageMarkers={pageMarkers}
          onNavigateToPage={handleNavigateToPage}
        />
      )}

      {selection && onAddHighlight && (
        <HighlightToolbar
          position={selection.position}
          selectedText={selection.text}
          onHighlight={handleAddHighlight}
          onAddBookmark={onAddBookmark || (() => {})}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
};
