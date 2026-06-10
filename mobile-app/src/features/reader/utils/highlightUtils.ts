/**
 * Highlight utility functions for the mobile reader.
 *
 * Provides:
 *  - Color definitions and mappings
 *  - Paragraph segmentation for inline highlight rendering
 *  - Offset boundary building + mapping (TextInput flat offsets → paragraph + offset)
 *  - Overlap detection for highlight validation
 */

import type { Highlight, HighlightColor } from "@/shared/types/book"

// ── Types ───────────────────────────────────────────────────────

export interface TextSegment {
  text: string
  isHighlighted: boolean
  color?: HighlightColor
  highlightId?: string
}

export interface ParagraphBoundary {
  paragraphIndex: number
  /** Absolute character offset where this paragraph starts (in the flat text) */
  startOffset: number
  /** Absolute character offset where this paragraph ends (exclusive) */
  endOffset: number
}

export interface SelectedText {
  text: string
  paragraphIndex: number
  startOffset: number
  endOffset: number
}

// ── Color definitions ───────────────────────────────────────────

export const HIGHLIGHT_COLORS: {
  color: HighlightColor
  hex: string
  rgba: string
  label: string
}[] = [
  { color: "yellow", hex: "#FFD600", rgba: "rgba(255, 255, 0, 0.3)", label: "Amarillo" },
  { color: "green", hex: "#00E676", rgba: "rgba(0, 255, 0, 0.3)", label: "Verde" },
  { color: "blue", hex: "#2979FF", rgba: "rgba(0, 150, 255, 0.3)", label: "Azul" },
  { color: "pink", hex: "#FF4081", rgba: "rgba(255, 105, 180, 0.3)", label: "Rosa" },
  { color: "orange", hex: "#FF9100", rgba: "rgba(255, 165, 0, 0.3)", label: "Naranja" },
]

const COLOR_MAP: Record<HighlightColor, (typeof HIGHLIGHT_COLORS)[0]> = Object.fromEntries(
  HIGHLIGHT_COLORS.map((c) => [c.color, c]),
) as any

/** Get the full-opacity hex color for a highlight color name. */
export function getHighlightColorHex(color: HighlightColor): string {
  return COLOR_MAP[color]?.hex ?? "#FFD600"
}

/**
 * Get an rgba string for a highlight color with the given alpha.
 * Uses the predefined rgba from HIGHLIGHT_COLORS by default (alpha ~0.3).
 */
export function getHighlightColorRgba(color: HighlightColor, alpha?: number): string {
  const entry = COLOR_MAP[color]
  if (!entry) return "rgba(255, 255, 0, 0.3)"
  if (alpha !== undefined) {
    return entry.rgba.replace(/[\d.]+\)$/, `${alpha})`)
  }
  return entry.rgba
}

// ── Segment splitting ───────────────────────────────────────────

/**
 * Split a paragraph's text into an array of segments.
 *
 * Each segment is either normal text (isHighlighted: false) or
 * highlighted text (isHighlighted: true, with color and highlightId).
 *
 * Used by the Reader to render highlights inline via nested <Text> components.
 *
 * @example
 *   splitParagraphWithHighlights("The quick brown fox", highlights, 5)
 *   // → [
 *   //     { text: "The ", isHighlighted: false },
 *   //     { text: "quick brown", isHighlighted: true, color: "yellow" },
 *   //     { text: " fox", isHighlighted: false },
 *   //   ]
 */
export function splitParagraphWithHighlights(
  text: string,
  highlights: Highlight[],
  paragraphIndex: number,
): TextSegment[] {
  const paraHighlights = highlights
    .filter((h) => h.paragraphIndex === paragraphIndex)
    .sort((a, b) => a.startOffset - b.startOffset)

  if (paraHighlights.length === 0) {
    return [{ text, isHighlighted: false }]
  }

  const segments: TextSegment[] = []
  let lastEnd = 0

  for (const h of paraHighlights) {
    // Clamp offsets to valid paragraph bounds
    const start = Math.max(0, Math.min(h.startOffset, text.length))
    const end = Math.max(start, Math.min(h.endOffset, text.length))

    // Skip zero-length or out-of-bounds highlights
    if (start >= end || start >= text.length) continue

    // Text before this highlight
    if (start > lastEnd) {
      segments.push({
        text: text.slice(lastEnd, start),
        isHighlighted: false,
      })
    }

    // The highlighted segment
    segments.push({
      text: text.slice(start, end),
      isHighlighted: true,
      color: h.color,
      highlightId: h.id,
    })

    lastEnd = end
  }

  // Trailing text after the last highlight
  if (lastEnd < text.length) {
    segments.push({
      text: text.slice(lastEnd),
      isHighlighted: false,
    })
  }

  return segments
}

// ── Paragraph boundary mapping ───────────────────────────────────

/**
 * Build cumulative character boundaries for all paragraphs.
 *
 * This creates a mapping between character offsets in the flat
 * concatenated text (used by TextInput) and individual paragraph
 * indices with relative offsets.
 *
 * Each boundary entry includes:
 *  - paragraphIndex: which paragraph
 *  - startOffset: absolute char position where this paragraph begins
 *  - endOffset: absolute char position where this paragraph ends (exclusive)
 *
 * Paragraphs are joined with "\n" as separator in the flat text.
 *
 * @example
 *   buildParagraphBoundaries(["abc", "de", "fghi"])
 *   // → [
 *   //   { paragraphIndex: 0, startOffset: 0, endOffset: 3 },
 *   //   { paragraphIndex: 1, startOffset: 4, endOffset: 6 },
 *   //   { paragraphIndex: 2, startOffset: 7, endOffset: 11 },
 *   // ]
 */
export function buildParagraphBoundaries(paragraphs: string[]): ParagraphBoundary[] {
  let offset = 0
  return paragraphs.map((p, i) => {
    const boundary: ParagraphBoundary = {
      paragraphIndex: i,
      startOffset: offset,
      endOffset: offset + p.length,
    }
    // +1 for the newline separator between paragraphs
    offset += p.length + 1
    return boundary
  })
}

/**
 * Map flat character offsets (from TextInput onSelectionChange)
 * to paragraph-relative offsets compatible with the Highlight data model.
 *
 * For v1: if the selection crosses paragraph boundaries, it is
 * limited to the first paragraph (the full text from the selection
 * start to the end of that paragraph).
 *
 * Returns null if:
 *  - boundaries array is empty
 *  - start === end (collapsed/empty selection)
 *  - no paragraph matches the start offset
 *  - selected text is less than 2 characters after trimming
 */
export function mapSelectionToParagraph(
  flatStart: number,
  flatEnd: number,
  boundaries: ParagraphBoundary[],
  paragraphs: string[],
): SelectedText | null {
  if (boundaries.length === 0) return null

  // Normalize: ensure start <= end
  const start = Math.min(flatStart, flatEnd)
  const end = Math.max(flatStart, flatEnd)

  if (start === end) return null

  // Find which paragraph contains the start offset
  const startBoundary = boundaries.find(
    (b) => start >= b.startOffset && start < b.endOffset,
  )
  if (!startBoundary) return null

  const paraText = paragraphs[startBoundary.paragraphIndex]
  if (!paraText || paraText.length === 0) return null

  // All within the same paragraph
  if (end <= startBoundary.endOffset) {
    const localStart = start - startBoundary.startOffset
    const localEnd = end - startBoundary.startOffset
    const text = paraText.slice(localStart, localEnd).trim()
    if (text.length < 2) return null

    return {
      paragraphIndex: startBoundary.paragraphIndex,
      startOffset: localStart,
      endOffset: localEnd,
      text,
    }
  }

  // Cross-paragraph: limit to first paragraph only (v1 simplification)
  const localStart = start - startBoundary.startOffset
  const text = paraText.slice(localStart).trim()
  if (text.length < 2) return null

  return {
    paragraphIndex: startBoundary.paragraphIndex,
    startOffset: localStart,
    endOffset: paraText.length,
    text,
  }
}

// ── Overlap / position helpers ───────────────────────────────────

/**
 * Find a highlight at a specific character position within a paragraph.
 * Returns the first matching highlight or null.
 */
export function getHighlightAtPosition(
  highlights: Highlight[],
  paragraphIndex: number,
  offset: number,
): Highlight | null {
  return (
    highlights.find(
      (h) =>
        h.paragraphIndex === paragraphIndex &&
        offset >= h.startOffset &&
        offset < h.endOffset,
    ) ?? null
  )
}

/**
 * Check if a proposed highlight range would overlap with any existing highlights
 * in the same paragraph. Overlap means the ranges share at least one character.
 */
export function doHighlightsOverlap(
  existing: Highlight[],
  paragraphIndex: number,
  startOffset: number,
  endOffset: number,
): boolean {
  return existing.some(
    (h) =>
      h.paragraphIndex === paragraphIndex &&
      startOffset < h.endOffset &&
      endOffset > h.startOffset,
  )
}

// ── Flat text helper ─────────────────────────────────────────────

/**
 * Get the flat concatenated text of all paragraphs joined by newlines.
 * Used as the value for the TextInput in TextSelector.
 */
export function getFlatText(paragraphs: string[]): string {
  return paragraphs.join("\n")
}
