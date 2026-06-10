import { useState } from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import {
  Clock,
  Trash2,
  ChevronRight,
  Cloud,
  CloudOff,
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

interface CardBookListProps {
  book: Book
  onOpen: (book: Book) => void
  onDelete: (id: string) => void
  onSyncPress?: (book: Book) => void
}

export function CardBookList({ book, onOpen, onDelete, onSyncPress }: CardBookListProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const bookColor = getBookColor(book.name)
  const progress = book.scrollPosition > 0 ? "En progreso" : "Sin empezar"
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

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{displayName}</Text>
          <View style={styles.metaRow}>
            <Clock size={12} color={THEME.colors.fontColorText} />
            <Text style={styles.metaText}>{formatTime(book.readingTimeSeconds ?? 0)}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{progress}</Text>
          </View>

          <Pressable onPress={() => onSyncPress?.(book)} style={styles.syncRow} hitSlop={8}>
            {book.isSynced ? (
              <Cloud size={12} color={THEME.colors.secondaryColor} />
            ) : (
              <CloudOff size={12} color={THEME.colors.fontColorText} />
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => setShowDeleteModal(true)} style={styles.deleteButton} hitSlop={8}>
          <Trash2 size={16} color={THEME.colors.fontColorText} />
        </Pressable>
        <ChevronRight size={18} color={THEME.colors.fontColorText} />
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
        <Text style={{ color: THEME.colors.fontColorText, fontSize: 15, lineHeight: 22 }}>
          Se eliminará "{displayName}" junto con todos sus marcadores y progreso.
        </Text>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.cardColor,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
    gap: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  pressed: { opacity: 0.85 },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: { fontSize: 20, fontWeight: "700" },
  info: { flex: 1, gap: 4 },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.colors.fontColorTitle,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: { fontSize: 12, color: THEME.colors.fontColorText },
  metaDot: {
    fontSize: 12,
    color: THEME.colors.fontColorText,
    marginHorizontal: 2,
  },
  syncRow: { flexDirection: "row", marginTop: 1 },
  deleteButton: { padding: 4 },
})
