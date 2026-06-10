/**
 * Page marker detection and navigation utilities.
 *
 * Parses [PAGE_N] markers embedded in book text, builds maps
 * from page number → paragraph index, and provides scroll
 * position calculations for page-based navigation.
 *
 * Text format:
 * ```
 * This is paragraph one.
 *
 * This is paragraph two.
 *
 * [PAGE_1]
 * This is page 2 text.
 * ```
 *
 * Paragraphs are split by double newlines.
 * Page markers are [PAGE_N] where N is the page number.
 */

export interface PageMarker {
  /** Index into the clean paragraphs array */
  paragraphIndex: number
  /** Page number from the marker */
  pageNumber: number
}

export interface ParsedText {
  /** Paragraphs with markers stripped */
  paragraphs: string[]
  /** Page marker locations */
  pageMarkers: PageMarker[]
  /** Total number of pages (derived from highest marker) */
  totalPages: number
}

/**
 * Parse book text into paragraphs and page markers.
 *
 * Splits on double newlines, strips [PAGE_N] markers,
 * and returns clean paragraphs + a marker map.
 */
export function parsePageMarkers(text: string): ParsedText {
  if (!text || text.trim().length === 0) {
    return { paragraphs: [], pageMarkers: [], totalPages: 0 }
  }

  const rawParagraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  const markers: PageMarker[] = []
  const cleanParagraphs: string[] = []

  rawParagraphs.forEach((p) => {
    const pageMatch = p.match(/^\[PAGE_(\d+)\]\s*/)
    if (pageMatch) {
      const pageNum = parseInt(pageMatch[1], 10)
      markers.push({
        paragraphIndex: cleanParagraphs.length,
        pageNumber: pageNum,
      })
      const cleanText = p.replace(/^\[PAGE_\d+\]\s*/, "").trim()
      if (cleanText) {
        cleanParagraphs.push(cleanText)
      }
    } else {
      cleanParagraphs.push(p)
    }
  })

  const totalPages =
    markers.length > 0
      ? Math.max(...markers.map((m) => m.pageNumber))
      : Math.max(cleanParagraphs.length, 1)

  return { paragraphs: cleanParagraphs, pageMarkers: markers, totalPages }
}

/**
 * Determine current page based on scroll position.
 *
 * Finds the paragraph at the center of the viewport, then maps
 * it to the highest page marker whose paragraphIndex is ≤ that.
 *
 * @param scrollOffset - Current scroll Y offset
 * @param paragraphOffsets - Y offsets for each paragraph
 * @param pageMarkers - Parsed page markers
 * @param viewportHeight - Height of the visible area
 * @param fallbackTotalPages - Used when there are no markers
 */
export function getCurrentPage(
  scrollOffset: number,
  paragraphOffsets: number[],
  pageMarkers: PageMarker[],
  viewportHeight: number,
  fallbackTotalPages?: number,
): number {
  if (paragraphOffsets.length === 0) return 1
  if (paragraphOffsets.length === 0) return 1

  // Find which paragraph is at/above the center of the viewport
  const scrollCenter = scrollOffset + viewportHeight / 2
  let currentParagraphIndex = 0
  for (let i = 0; i < paragraphOffsets.length; i++) {
    if (paragraphOffsets[i] > scrollCenter && i > 0) {
      break
    }
    currentParagraphIndex = i
  }

  if (pageMarkers.length > 0) {
    let currentPage = 1
    for (const marker of pageMarkers) {
      if (currentParagraphIndex >= marker.paragraphIndex) {
        currentPage = marker.pageNumber
      } else {
        break
      }
    }
    return currentPage
  }

  // No markers — estimate from scroll progress
  if (fallbackTotalPages && fallbackTotalPages > 0) {
    const lastOffset = paragraphOffsets[paragraphOffsets.length - 1] || 1
    const contentHeight = lastOffset + viewportHeight
    const maxScroll = Math.max(contentHeight - viewportHeight, 1)
    const progress = Math.min(scrollOffset / maxScroll, 1)
    return Math.max(1, Math.ceil(progress * fallbackTotalPages))
  }

  return currentParagraphIndex + 1
}

/**
 * Calculate the target scroll Y position for a given page number.
 *
 * If a marker exists for the page, returns the paragraph offset.
 * Otherwise estimates from scroll progress proportion.
 */
export function getPageScrollPosition(
  pageNumber: number,
  pageMarkers: PageMarker[],
  paragraphOffsets: number[],
  fallbackTotalPages?: number,
): number {
  if (paragraphOffsets.length === 0) return 0

  const targetMarker = pageMarkers.find((m) => m.pageNumber === pageNumber)
  if (targetMarker && paragraphOffsets[targetMarker.paragraphIndex] !== undefined) {
    return paragraphOffsets[targetMarker.paragraphIndex]
  }

  // No marker found — estimate based on total pages
  if (pageMarkers.length === 0 && fallbackTotalPages && fallbackTotalPages > 0) {
    const lastOffset = paragraphOffsets[paragraphOffsets.length - 1] || 0
    const progress = (pageNumber - 1) / Math.max(fallbackTotalPages, 1)
    return Math.round(progress * lastOffset)
  }

  // Fallback: scroll to top
  return 0
}
