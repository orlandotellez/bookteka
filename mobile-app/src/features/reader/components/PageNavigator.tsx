import { useState } from "react"
import {
  View, Text, Pressable, StyleSheet, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from "react-native"
import {
  ChevronLeft, ChevronRight, Highlighter, Bookmark,
} from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"

interface PageNavigatorProps {
  currentPage: number
  totalPages: number
  onNavigateToPage: (pageNumber: number) => void
  onOpenSettings: () => void
  onToggleHighlight?: () => void
  isHighlightMode?: boolean
  onToggleBookmark?: () => void
  isCurrentPageBookmarked?: boolean
}

export function PageNavigator({
  currentPage, totalPages, onNavigateToPage, onOpenSettings,
  onToggleHighlight, isHighlightMode,
  onToggleBookmark, isCurrentPageBookmarked,
}: PageNavigatorProps) {
  const [showGoTo, setShowGoTo] = useState(false)
  const [inputValue, setInputValue] = useState("")

  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  return (
    <>
      <View style={styles.container}>
        <Pressable
          style={({ pressed }) => [styles.navButton, !canGoPrev && styles.navButtonDisabled, pressed && canGoPrev && styles.navButtonPressed]}
          onPress={() => canGoPrev && onNavigateToPage(currentPage - 1)}
          disabled={!canGoPrev} hitSlop={8}
        >
          <ChevronLeft size={20} color={canGoPrev ? THEME.colors.fontColorTitle : THEME.colors.fontColorText} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.pageIndicator, pressed && styles.pageIndicatorPressed]}
          onPress={() => { setInputValue(String(currentPage)); setShowGoTo(true) }}
        >
          <Text style={styles.pageText}>
            <Text style={styles.pageCurrent}>{currentPage}</Text>
            <Text style={styles.pageSeparator}> / </Text>
            <Text style={styles.pageTotal}>{totalPages}</Text>
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.navButton, !canGoNext && styles.navButtonDisabled, pressed && canGoNext && styles.navButtonPressed]}
          onPress={() => canGoNext && onNavigateToPage(currentPage + 1)}
          disabled={!canGoNext} hitSlop={8}
        >
          <ChevronRight size={20} color={canGoNext ? THEME.colors.fontColorTitle : THEME.colors.fontColorText} />
        </Pressable>

        {onToggleHighlight && (
          <Pressable
            style={({ pressed }) => [styles.highlightButton, isHighlightMode && styles.highlightButtonActive, pressed && styles.highlightButtonPressed]}
            onPress={onToggleHighlight} hitSlop={8}
          >
            <Highlighter size={18} color={isHighlightMode ? "#fff" : THEME.colors.fontColorTitle} />
          </Pressable>
        )}

        {onToggleBookmark && (
          <Pressable
            style={({ pressed }) => [styles.bookmarkButton, isCurrentPageBookmarked && styles.bookmarkButtonActive, pressed && styles.bookmarkButtonPressed]}
            onPress={onToggleBookmark} hitSlop={8}
          >
            <Bookmark size={16} color={isCurrentPageBookmarked ? "#fff" : THEME.colors.fontColorTitle}
              fill={isCurrentPageBookmarked ? "#fff" : "none"} />
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
          onPress={onOpenSettings} hitSlop={8}
        >
          <Text style={styles.settingsIcon}>Aa</Text>
        </Pressable>
      </View>

      <Modal visible={showGoTo} transparent animationType="fade" onRequestClose={() => setShowGoTo(false)}>
        <KeyboardAvoidingView style={styles.goToOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.goToOverlay} onPress={() => setShowGoTo(false)}>
            <Pressable style={styles.goToCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.goToTitle}>Ir a página</Text>
              <Text style={styles.goToSubtitle}>Ingresa un número entre 1 y {totalPages}</Text>
              <TextInput
                style={styles.goToInput} value={inputValue}
                onChangeText={setInputValue} keyboardType="number-pad"
                autoFocus selectTextOnFocus
                placeholderTextColor={THEME.colors.fontColorText}
                onSubmitEditing={() => {
                  const page = parseInt(inputValue, 10)
                  if (!isNaN(page) && page >= 1 && page <= totalPages) onNavigateToPage(page)
                  setShowGoTo(false)
                  setInputValue("")
                }}
                returnKeyType="go"
              />
              <View style={styles.goToActions}>
                <Pressable
                  style={({ pressed }) => [styles.goToButton, styles.goToButtonCancel, pressed && styles.goToButtonPressed]}
                  onPress={() => setShowGoTo(false)}
                >
                  <Text style={[styles.goToButtonText, styles.goToButtonTextCancel]}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.goToButton, styles.goToButtonConfirm, pressed && styles.goToButtonPressed]}
                  onPress={() => {
                    const page = parseInt(inputValue, 10)
                    if (!isNaN(page) && page >= 1 && page <= totalPages) onNavigateToPage(page)
                    setShowGoTo(false)
                    setInputValue("")
                  }}
                >
                  <Text style={styles.goToButtonTextConfirm}>Ir</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: THEME.colors.windowColor,
    borderTopWidth: 1, borderTopColor: THEME.colors.borderColor, gap: 8,
  },
  navButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center", alignItems: "center",
  },
  navButtonDisabled: { opacity: 0.35 },
  navButtonPressed: { opacity: 0.7, backgroundColor: THEME.colors.fourColor },
  pageIndicator: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8, marginHorizontal: 4 },
  pageIndicatorPressed: { opacity: 0.7 },
  pageText: { fontSize: 15, fontWeight: "600" },
  pageCurrent: { color: THEME.colors.fontColorTitle, fontWeight: "700" },
  pageSeparator: { color: THEME.colors.fontColorText, fontWeight: "400" },
  pageTotal: { color: THEME.colors.fontColorText, fontWeight: "400" },
  settingsButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center", alignItems: "center",
  },
  settingsButtonPressed: { opacity: 0.7 },
  settingsIcon: { fontSize: 16, fontWeight: "800", color: THEME.colors.fontColorTitle },
  highlightButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center", alignItems: "center",
  },
  highlightButtonActive: { backgroundColor: THEME.colors.secondaryColor },
  highlightButtonPressed: { opacity: 0.7 },
  bookmarkButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center", alignItems: "center",
  },
  bookmarkButtonActive: { backgroundColor: THEME.colors.secondaryColor },
  bookmarkButtonPressed: { opacity: 0.7 },
  goToOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" },
  goToCard: {
    width: 280, backgroundColor: THEME.colors.primaryColor,
    borderRadius: 16, padding: 24, gap: 16,
  },
  goToTitle: { fontSize: 18, fontWeight: "700", color: THEME.colors.fontColorTitle, textAlign: "center" },
  goToSubtitle: { fontSize: 13, color: THEME.colors.fontColorText, textAlign: "center" },
  goToInput: {
    height: 48, borderWidth: 1.5, borderColor: THEME.colors.borderColor,
    borderRadius: 12, paddingHorizontal: 16, fontSize: 20, fontWeight: "700",
    color: THEME.colors.fontColorTitle, textAlign: "center",
    backgroundColor: THEME.colors.fourColor,
  },
  goToActions: { flexDirection: "row", gap: 12 },
  goToButton: { flex: 1, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  goToButtonCancel: { backgroundColor: THEME.colors.thirdColor },
  goToButtonConfirm: { backgroundColor: THEME.colors.secondaryColor },
  goToButtonPressed: { opacity: 0.7 },
  goToButtonText: { fontSize: 15, fontWeight: "600" },
  goToButtonTextCancel: { color: THEME.colors.fontColorTitle },
  goToButtonTextConfirm: { color: "#fff" },
})
