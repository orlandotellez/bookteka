import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type LayoutChangeEvent,
  type ScrollView as ScrollViewType,
} from "react-native"
import { THEME } from "@/shared/lib/theme"
import type { ReadingSettings } from "@/shared/types/reading"
import type { Highlight } from "@/shared/types/book"
import type { PageMarker } from "@/utils/pageDetector"
import {
  splitParagraphWithHighlights,
  getHighlightColorRgba,
} from "../utils/highlightUtils"

// ── Props ─────────────────────────────────────────────────────

interface ReaderContentProps {
  paragraphs: string[]
  pageMarkers: PageMarker[]
  totalPages: number
  settings: ReadingSettings
  highlights: Highlight[]
  getHighlightsForParagraph: (index: number) => Highlight[]
  scrollViewRef: React.RefObject<ScrollViewType | null>
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  onScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  onContentSizeChange: (w: number, h: number) => void
  onViewLayout: (event: LayoutChangeEvent) => void
  onParagraphLayout: (index: number, event: LayoutChangeEvent) => void
  onParagraphLongPress: (index: number) => void
  onParagraphTap: (index: number, offset: number) => void
}

// ── Font family helper ───────────────────────────────────────

function fontFamilyValue(fontFamily: string): string | undefined {
  switch (fontFamily) {
    case "serif":
      return "serif"
    case "mono":
      return Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" })
    case "dyslexic":
      return Platform.select({ ios: "OpenDyslexic", android: "OpenDyslexic", default: undefined })
    default:
      return undefined
  }
}

// ── Component ─────────────────────────────────────────────────

export function ReaderContent({
  paragraphs,
  pageMarkers,
  totalPages,
  settings,
  highlights,
  getHighlightsForParagraph,
  scrollViewRef,
  onScroll,
  onScrollEnd,
  onContentSizeChange,
  onViewLayout,
  onParagraphLayout,
  onParagraphLongPress,
  onParagraphTap,
}: ReaderContentProps) {
  return (
    <View style={styles.readerArea} onLayout={onViewLayout}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: Math.round(
              ((100 - settings.textWidth) / 100) * 32,
            ),
          },
        ]}
        onScroll={onScroll}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={onContentSizeChange}
      >
        {paragraphs.map((paragraph, index) => {
          const isPageMarker = pageMarkers.some(
            (m) => m.paragraphIndex === index,
          )
          const paraHighlights = getHighlightsForParagraph(index)
          const segments = splitParagraphWithHighlights(
            paragraph,
            highlights,
            index,
          )

          return (
            <View key={`p-${index}`}>
              {/* Page separator */}
              {isPageMarker && (
                <View style={styles.pageSeparator}>
                  <View style={styles.pageSeparatorLine} />
                  <Text style={styles.pageSeparatorText}>
                    [PÁGINA{" "}
                    {pageMarkers.find((m) => m.paragraphIndex === index)
                      ?.pageNumber || ""}
                    ]
                  </Text>
                  <View style={styles.pageSeparatorLine} />
                </View>
              )}

              <Pressable
                onLongPress={() => onParagraphLongPress(index)}
                delayLongPress={600}
                onPress={() => {
                  if (paraHighlights.length > 0) {
                    onParagraphTap(index, 0)
                  }
                }}
              >
                <Text
                  onLayout={(e) => onParagraphLayout(index, e)}
                  style={[
                    styles.paragraph,
                    {
                      fontSize: settings.fontSize,
                      lineHeight: Math.round(settings.fontSize * settings.lineHeight),
                      fontFamily: fontFamilyValue(settings.fontFamily),
                    },
                  ]}
                >
                  {segments.map((seg, segIndex) =>
                    seg.isHighlighted ? (
                      <Text
                        key={`seg-${segIndex}`}
                        style={{
                          backgroundColor: getHighlightColorRgba(
                            seg.color!,
                          ),
                        }}
                      >
                        {seg.text}
                      </Text>
                    ) : (
                      <Text key={`seg-${segIndex}`}>{seg.text}</Text>
                    ),
                  )}
                </Text>
              </Pressable>
            </View>
          )
        })}

        {/* End marker */}
        {paragraphs.length > 0 && (
          <View style={styles.endMarker}>
            <View style={styles.endLine} />
            <Text style={styles.endText}>Fin del libro</Text>
            <View style={styles.endLine} />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  readerArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  paragraph: {
    color: THEME.colors.fontColorTitle,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  pageSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 10,
  },
  pageSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.borderColor,
  },
  pageSeparatorText: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.fontColorText,
    letterSpacing: 1,
  },
  endMarker: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 60,
    gap: 10,
  },
  endLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.borderColor,
  },
  endText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.fontColorText,
    fontStyle: "italic",
  },
})
