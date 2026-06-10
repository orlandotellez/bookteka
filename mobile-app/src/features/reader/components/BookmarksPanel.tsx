import { useState, useEffect } from "react"
import {
  View, Text, Pressable, StyleSheet, Modal, TextInput,
  FlatList, KeyboardAvoidingView, Platform,
} from "react-native"
import { Bookmark, Plus, X, Trash2 } from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"
import type { Bookmark as BookmarkType } from "@/shared/types/book"

interface BookmarksPanelProps {
  visible: boolean
  onClose: () => void
  bookmarks: BookmarkType[]
  currentPage: number
  onAddBookmark: (name: string) => Promise<void>
  onDeleteBookmark: (id: string) => Promise<void>
  onNavigateToPage: (pageNumber: number) => void
}

export function BookmarksPanel({
  visible, onClose, bookmarks, currentPage,
  onAddBookmark, onDeleteBookmark, onNavigateToPage,
}: BookmarksPanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("")

  useEffect(() => {
    if (visible) { setIsAdding(false); setNewName("") }
  }, [visible])

  const sortedBookmarks = [...bookmarks].sort((a, b) => a.pageNumber - b.pageNumber)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.panel}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Bookmark size={18} color={THEME.colors.fontColorTitle} />
              <Text style={styles.title}>Marcadores</Text>
              <View style={styles.countBadge}><Text style={styles.countBadgeText}>{bookmarks.length}</Text></View>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <X size={20} color={THEME.colors.fontColorTitle} />
            </Pressable>
          </View>

          <View style={styles.addSection}>
            {isAdding ? (
              <View style={styles.addForm}>
                <TextInput
                  style={styles.addInput}
                  placeholder="Nombre del marcador"
                  placeholderTextColor={THEME.colors.fontColorText}
                  value={newName} onChangeText={setNewName}
                  autoFocus onSubmitEditing={async () => {
                    const name = newName.trim()
                    if (!name) return
                    await onAddBookmark(name)
                    setNewName(""); setIsAdding(false)
                  }}
                  returnKeyType="done"
                />
                <View style={styles.addFormActions}>
                  <Pressable
                    style={({ pressed }) => [styles.addFormBtn, styles.addFormBtnCancel, pressed && styles.pressed]}
                    onPress={() => { setIsAdding(false); setNewName("") }}
                  >
                    <Text style={styles.addFormBtnTextCancel}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.addFormBtn, styles.addFormBtnSave, pressed && styles.pressed, !newName.trim() && styles.addFormBtnDisabled]}
                    onPress={async () => {
                      const name = newName.trim()
                      if (!name) return
                      await onAddBookmark(name)
                      setNewName(""); setIsAdding(false)
                    }}
                    disabled={!newName.trim()}
                  >
                    <Text style={styles.addFormBtnTextSave}>Guardar</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                onPress={() => { setNewName(`Página ${currentPage}`); setIsAdding(true) }}
              >
                <Plus size={16} color={THEME.colors.fontColorTitle} />
                <Text style={styles.addButtonText}>Añadir marcador</Text>
              </Pressable>
            )}
          </View>

          {sortedBookmarks.length === 0 ? (
            <View style={styles.emptyState}>
              <Bookmark size={40} color={THEME.colors.fontColorText} />
              <Text style={styles.emptyTitle}>No hay marcadores aún</Text>
              <Text style={styles.emptySubtitle}>Añade un marcador para guardar tu progreso.</Text>
            </View>
          ) : (
            <FlatList
              data={sortedBookmarks}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.bookmarkItem, pressed && styles.bookmarkItemPressed]}
                  onPress={() => onNavigateToPage(item.pageNumber)}
                >
                  <View style={styles.pageBadge}><Text style={styles.pageBadgeText}>{item.pageNumber}</Text></View>
                  <View style={styles.bookmarkContent}>
                    <Text style={styles.bookmarkName} numberOfLines={1}>{item.name}</Text>
                    {item.textPreview ? (
                      <Text style={styles.bookmarkPreview} numberOfLines={1}>"{item.textPreview}…"</Text>
                    ) : null}
                    <Text style={styles.bookmarkDate}>
                      {new Date(item.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
                    onPress={(e) => { e.stopPropagation?.(); onDeleteBookmark(item.id) }} hitSlop={8}
                  >
                    <Trash2 size={16} color={THEME.colors.fontColorText} />
                  </Pressable>
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  panel: {
    backgroundColor: THEME.colors.primaryColor,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "85%", minHeight: 260,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 18, fontWeight: "700", color: THEME.colors.fontColorTitle },
  countBadge: {
    backgroundColor: THEME.colors.secondaryColor, borderRadius: 10,
    minWidth: 22, height: 22, justifyContent: "center", alignItems: "center",
    paddingHorizontal: 6,
  },
  countBadgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  closeButton: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  addSection: { paddingHorizontal: 20, paddingVertical: 8 },
  addButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, borderRadius: 12, backgroundColor: THEME.colors.thirdColor,
  },
  addButtonText: { fontSize: 14, fontWeight: "600", color: THEME.colors.fontColorTitle },
  addForm: { gap: 10 },
  addInput: {
    height: 44, borderWidth: 1.5, borderColor: THEME.colors.borderColor,
    borderRadius: 12, paddingHorizontal: 14, fontSize: 15,
    color: THEME.colors.fontColorTitle, backgroundColor: THEME.colors.fourColor,
  },
  addFormActions: { flexDirection: "row", gap: 10 },
  addFormBtn: { flex: 1, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  addFormBtnCancel: { backgroundColor: THEME.colors.thirdColor },
  addFormBtnSave: { backgroundColor: THEME.colors.secondaryColor },
  addFormBtnDisabled: { opacity: 0.45 },
  addFormBtnTextCancel: { fontSize: 14, fontWeight: "600", color: THEME.colors.fontColorTitle },
  addFormBtnTextSave: { fontSize: 14, fontWeight: "600", color: "#fff" },
  listContent: { paddingHorizontal: 20, paddingBottom: 8 },
  bookmarkItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12,
    marginBottom: 6, backgroundColor: THEME.colors.fourColor, gap: 12,
  },
  bookmarkItemPressed: { opacity: 0.7, backgroundColor: THEME.colors.thirdColor },
  pageBadge: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: THEME.colors.secondaryColor,
    justifyContent: "center", alignItems: "center",
  },
  pageBadgeText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  bookmarkContent: { flex: 1, gap: 2 },
  bookmarkName: { fontSize: 14, fontWeight: "600", color: THEME.colors.fontColorTitle },
  bookmarkPreview: { fontSize: 12, color: THEME.colors.fontColorText, lineHeight: 16 },
  bookmarkDate: { fontSize: 11, color: THEME.colors.fontColorText, marginTop: 2 },
  deleteButton: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  deleteButtonPressed: { backgroundColor: THEME.colors.thirdColor },
  emptyState: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: 40, paddingHorizontal: 32, gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: THEME.colors.fontColorTitle },
  emptySubtitle: { fontSize: 13, color: THEME.colors.fontColorText, textAlign: "center", lineHeight: 18 },
  pressed: { opacity: 0.7 },
})
