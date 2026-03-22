import React, { useMemo, useRef, useEffect, useCallback, useState } from "react";
import type { ReadingSettings } from "./ReadingControls";
import type { Highlight, HighlightColor } from "@/types/book";
import { HighlightToolbar } from "./HighlightToolbar";
import { PageNavigator } from "./PageNavigator";
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
}>(({ paragraph, highlights, HIGHLIGHT_CLASS_MAP }) => {
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
      >
        {paragraph.slice(h.startOffset, h.startOffset + h.text.length)}
      </mark>,
    );

    lastEnd = h.startOffset + h.text.length;
  });

  if (lastEnd < paragraph.length) {
    parts.push(
      <span key={`text-end-${lastEnd}`}>{paragraph.slice(lastEnd)}</span>,
    );
  }

  return <>{parts}</>;
});

Paragraph.displayName = "Paragraph";

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
  isZenMode = false,
  onToggleZenMode,
}: TextReaderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRestoredPosition = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selection, setSelection] = useState<any>(null);

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
          const startOffset = range.startOffset;
          const endOffset = range.endOffset;
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
      for (const marker of pageMarkers) {
        if (currentParagraphIndex >= marker.paragraphIndex) {
          currentPageFromScroll = marker.pageNumber;
        } else {
          break;
        }
      }

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

      if (onScrollPositionChange) {
        onScrollPositionChange(scrollY);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [pageMarkers, totalPages, onScrollPositionChange]);

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
      const targetMarker = pageMarkers.find(
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
      } else if (pageMarkers.length === 0 && totalPages) {
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
      <article className={styles.article}>
        <div className={styles.readerContent}>
          {paragraphs.map((paragraph, index) => (
            <p
              key={index}
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
              />
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
          isZenMode={isZenMode}
          onToggleZenMode={onToggleZenMode}
        />
      )}

      {selection && onAddHighlight && (
        <HighlightToolbar
          position={selection.position}
          selectedText={selection.text}
          onHighlight={handleAddHighlight}
          onAddBookmark={onAddBookmark || (() => { })}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
};
