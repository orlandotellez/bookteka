/**
 * TextSelector — React Native text selection workaround.
 *
 * THE PROBLEM:
 * React Native has NO window.getSelection(), no document.createRange(),
 * no Selection API. We cannot detect what text a user selected by
 * dragging across <Text> components.
 *
 * THE SOLUTION (TextInput + Mapping):
 * 1. Render a TextInput containing the full concatenated text
 * 2. Native TextInput on mobile supports text selection via long-press + drag handles
 * 3. onSelectionChange gives `{ start, end }` — character offsets in the flat text
 * 4. Map these flat offsets → paragraphIndex + startOffset + endOffset
 *    using pre-computed paragraph boundaries
 * 5. Return the result as a SelectedText compatible with the Highlight data model
 *
 * USAGE:
 * ```tsx
 * const selectorRef = useRef<TextSelectorHandle>(null)
 *
 * // To enter selection mode:
 * selectorRef.current?.enterSelectionMode()
 *
 * // Receive the result:
 * <TextSelector
 *   ref={selectorRef}
 *   paragraphs={paragraphs}
 *   onSelection={(selection) => {
 *     if (selection) {
 *       // User selected text — show highlight toolbar
 *     } else {
 *       // User cancelled
 *     }
 *   }}
 * />
 * ```
 */

import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react"
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from "react-native"
import { X, Highlighter } from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"
import type { SelectedText } from "../utils/highlightUtils"
import {
  buildParagraphBoundaries,
  mapSelectionToParagraph,
  getFlatText,
} from "../utils/highlightUtils"

// ── Types ───────────────────────────────────────────────────────

export interface TextSelectorHandle {
  /** Open the text selection modal and focus the TextInput */
  enterSelectionMode: () => void
  /** Close the text selection modal and reset state */
  exitSelectionMode: () => void
}

interface TextSelectionState {
  start: number
  end: number
}

interface TextSelectorProps {
  /** Array of paragraph strings (used for boundary calculation) */
  paragraphs: string[]
  /**
   * Called when selection is complete or cancelled.
   * - selection === SelectedText: user confirmed a selection
   * - selection === null: user cancelled
   */
  onSelection: (selection: SelectedText | null) => void
}

// ── Component ───────────────────────────────────────────────────

export const TextSelector = forwardRef<TextSelectorHandle, TextSelectorProps>(
  ({ paragraphs, onSelection }, ref) => {
    const inputRef = useRef<TextInput>(null)

    const [isVisible, setIsVisible] = useState(false)
    const [selection, setSelection] = useState<TextSelectionState>({
      start: 0,
      end: 0,
    })

    // Pre-compute flat text + paragraph boundaries (memoized)
    const flatText = useMemo(() => getFlatText(paragraphs), [paragraphs])
    const boundaries = useMemo(
      () => buildParagraphBoundaries(paragraphs),
      [paragraphs],
    )

    const hasSelection = selection.start !== selection.end

    // ── Imperative API ───────────────────────────────────────

    useImperativeHandle(ref, () => ({
      enterSelectionMode: () => {
        setIsVisible(true)
        setSelection({ start: 0, end: 0 })
        // Focus the TextInput after the modal animation completes
        setTimeout(() => {
          inputRef.current?.focus()
        }, 400)
      },
      exitSelectionMode: () => {
        setIsVisible(false)
        setSelection({ start: 0, end: 0 })
      },
    }))

    // ── Selection change handler ─────────────────────────────

    const handleSelectionChange = useCallback(
      (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
        const { start, end } = e.nativeEvent.selection
        setSelection({ start, end })
      },
      [],
    )

    // ── Confirm / Cancel ────────────────────────────────────

    const handleConfirm = useCallback(() => {
      if (!hasSelection) return

      const result = mapSelectionToParagraph(
        selection.start,
        selection.end,
        boundaries,
        paragraphs,
      )

      if (result) {
        setIsVisible(false)
        setSelection({ start: 0, end: 0 })
        onSelection(result)
      }
    }, [hasSelection, selection, boundaries, paragraphs, onSelection])

    const handleCancel = useCallback(() => {
      setIsVisible(false)
      setSelection({ start: 0, end: 0 })
      onSelection(null)
    }, [onSelection])

    // ── Selection preview text ───────────────────────────────

    const selectedPreviewText = useMemo(() => {
      if (!hasSelection) return ""
      const start = Math.min(selection.start, selection.end)
      const end = Math.max(selection.start, selection.end)
      return flatText.slice(start, end).trim()
    }, [hasSelection, selection, flatText])

    // ── Render ──────────────────────────────────────────────

    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancel}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* ── Header ───────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Highlighter size={18} color={THEME.colors.secondaryColor} />
              <Text style={styles.headerTitle}>Seleccionar texto</Text>
            </View>
            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.headerButtonPressed,
              ]}
              hitSlop={8}
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
            >
              <X size={20} color={THEME.colors.fontColorTitle} />
            </Pressable>
          </View>

          {/* ── Instructions ─────────────────────────────── */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsText}>
              Arrastrá sobre el texto para seleccionar. Usá los indicadores
              para ajustar la selección. Después presioná "Resaltar".
            </Text>
          </View>

          {/* ── TextInput (native selection) ─────────────── */}
          <ScrollView
            style={styles.scrollArea}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                {
                  color: THEME.colors.fontColorTitle,
                  fontSize: 16,
                  lineHeight: 24,
                },
              ]}
              value={flatText}
              multiline
              editable
              selectionColor={
                Platform.OS === "ios" ? "rgba(223, 128, 82, 0.3)" : THEME.colors.secondaryColor
              }
              onSelectionChange={handleSelectionChange}
              autoCapitalize="none"
              autoCorrect={false}
              scrollEnabled={false}
              textAlignVertical="top"
            />
          </ScrollView>

          {/* ── Footer: Preview + Actions ────────────────── */}
          {hasSelection && (
            <View style={styles.footer}>
              {/* Selected text preview */}
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel} numberOfLines={1}>
                  Seleccionado:
                </Text>
                <Text style={styles.previewText} numberOfLines={2}>
                  {selectedPreviewText}
                </Text>
              </View>

              {/* Action buttons */}
              <View style={styles.actions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.confirmButton,
                    pressed && styles.confirmButtonPressed,
                  ]}
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmText}>Resaltar</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Empty footer when no selection ───────────── */}
          {!hasSelection && <View style={styles.emptyFooter} />}
        </KeyboardAvoidingView>
      </Modal>
    )
  },
)

TextSelector.displayName = "TextSelector"

// ── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.primaryColor,
  },

  // ── Header ─────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderColor,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: THEME.colors.fontColorTitle,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  headerButtonPressed: {
    opacity: 0.7,
  },

  // ── Instructions ───────────────────────────────────────
  instructions: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.thirdColor,
    borderRadius: 10,
  },
  instructionsText: {
    fontSize: 13,
    color: THEME.colors.fontColorText,
    textAlign: "center",
    lineHeight: 18,
  },

  // ── TextInput area ─────────────────────────────────────
  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  textInput: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: THEME.colors.fourColor,
    minHeight: 200,
  },

  // ── Footer with selection preview ──────────────────────
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderColor,
    backgroundColor: THEME.colors.windowColor,
    gap: 12,
  },
  previewContainer: {
    gap: 4,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.fontColorText,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewText: {
    fontSize: 14,
    color: THEME.colors.fontColorTitle,
    fontStyle: "italic",
    lineHeight: 19,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.colors.thirdColor,
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  confirmButton: {
    backgroundColor: THEME.colors.secondaryColor,
  },
  confirmButtonPressed: {
    opacity: 0.7,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.colors.fontColorTitle,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },

  // ── Empty footer (no selection) ────────────────────────
  emptyFooter: {
    height: Platform.OS === "ios" ? 80 : 60,
  },
})
