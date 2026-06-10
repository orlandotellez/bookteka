import { useState } from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import {
  Clock,
  Trash2,
  Cloud,
  CloudOff,
  BookOpen,
} from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"
import type { Book } from "@/shared/types/book"
import { formatTime } from "@/utils/time"
import { Modal } from "@/components/common"

// deterministic book color from name
function getBookColor(name: string): string {
  const colors = [
    "#df8052", "#0284c7", "#059669", "#8b6914",
    "#7c3aed", "#db2777", "#0891b2", "#d97706",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getBookInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?"
}

interface CardBookProps {
  book: Book
  onOpen: (book: Book) => void
  onDelete: (id: string) => void
  onSyncPress?: (book: Book) => void
}

export function CardBook({ book, onOpen, onDelete, onSyncPress }: CardBookProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const bookColor = getBookColor(book.name)
  const progress =
    book.totalPages && book.totalPages > 0
      ? Math.min(
          Math.round(
            ((book.scrollPosition ?? 0) / (book.totalPages ?? 1)) * 100,
          ),
          100,
        )
      : 0

  const displayName = book.name.replace(".pdf", "")

  return (
    <>
      <Pressable
        onPress={() => onOpen(book)}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={[styles.iconWrapper, { backgroundColor: bookColor + "20" }]}>
          <Text style={[styles.iconText, { color: bookColor }]}>
            {getBookInitial(displayName)}
          </Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {displayName}
        </Text>

        <View style={styles.metaRow}>
          <Clock size={12} color={THEME.colors.fontColorText} />
          <Text style={styles.metaText}>
            {formatTime(book.readingTimeSeconds ?? 0)}
          </Text>
        </View>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => onOpen(book)} style={styles.readButton}>
            <BookOpen size={12} color="#fff" />
            <Text style={styles.readButtonText}>
              {book.scrollPosition > 0 ? "Continuar" : "Empezar"}
            </Text>
          </Pressable>

          <Pressable onPress={() => onSyncPress?.(book)} style={styles.syncIndicator} hitSlop={8}>
            {book.isSynced ? (
              <Cloud size={14} color={THEME.colors.secondaryColor} />
            ) : (
              <CloudOff size={14} color={THEME.colors.fontColorText} />
            )}
          </Pressable>

          <Pressable onPress={() => setShowDeleteModal(true)} style={styles.deleteButton} hitSlop={8}>
            <Trash2 size={14} color={THEME.colors.fontColorText} />
          </Pressable>
        </View>
      </Pressable>

      <Modal
        visible={showDeleteModal}
        title="¿Eliminar libro?"
        onClose={() => setShowDeleteModal(false)}
        actions={[
          {
            label: "Cancelar",
            variant: "cancel",
            onPress: () => setShowDeleteModal(false),
          },
          {
            label: "Eliminar",
            variant: "danger",
            onPress: () => {
              onDelete(book.id)
              setShowDeleteModal(false)
            },
          },
        ]}
      >
        <Text style={styles.deleteText}>
          Se eliminará "{displayName}" junto con todos sus marcadores y progreso.
        </Text>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.cardColor,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
    gap: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  pressed: { opacity: 0.85 },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  iconText: { fontSize: 22, fontWeight: "700" },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.colors.fontColorTitle,
    textAlign: "center",
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  metaText: { fontSize: 12, color: THEME.colors.fontColorText },
  progressBarBg: {
    height: 4,
    backgroundColor: THEME.colors.thirdColor,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: THEME.colors.secondaryColor,
    borderRadius: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 2,
  },
  readButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: THEME.colors.secondaryColor,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
  },
  readButtonText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  syncIndicator: { padding: 4 },
  deleteButton: { padding: 4 },
  deleteText: { color: THEME.colors.fontColorText, fontSize: 15, lineHeight: 22 },
})
