import { View, Text, Pressable, StyleSheet } from "react-native"
import { X, Trash2 } from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"
import type { HighlightColor } from "@/shared/types/book"

interface HighlightToolbarProps {
  visible: boolean
  onSelectColor: (color: HighlightColor) => void
  onRemoveHighlight?: () => void
  onClose: () => void
  showRemoveOption?: boolean
}

const COLOR_CIRCLES: { color: HighlightColor; backgroundColor: string }[] = [
  { color: "yellow", backgroundColor: "#FFD600" },
  { color: "green", backgroundColor: "#00E676" },
  { color: "blue", backgroundColor: "#2979FF" },
  { color: "pink", backgroundColor: "#FF4081" },
  { color: "orange", backgroundColor: "#FF9100" },
]

export function HighlightToolbar({
  visible, onSelectColor, onRemoveHighlight,
  onClose, showRemoveOption = false,
}: HighlightToolbarProps) {
  if (!visible) return null

  return (
    <View style={styles.container}>
      <View style={styles.colors}>
        {COLOR_CIRCLES.map(({ color, backgroundColor }) => (
          <Pressable
            key={color}
            style={({ pressed }) => [styles.colorCircle, { backgroundColor }, pressed && styles.colorCirclePressed]}
            onPress={() => onSelectColor(color)} hitSlop={6}
          />
        ))}
      </View>

      <View style={styles.divider} />

      {showRemoveOption && onRemoveHighlight ? (
        <Pressable
          style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
          onPress={onRemoveHighlight} hitSlop={6}
        >
          <Trash2 size={16} color="#ff4444" />
          <Text style={styles.removeText}>Eliminar</Text>
        </Pressable>
      ) : (
        <View style={styles.removePlaceholder} />
      )}

      <Pressable
        style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
        onPress={onClose} hitSlop={6}
      >
        <X size={18} color={THEME.colors.fontColorTitle} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: THEME.colors.windowColor,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: THEME.colors.borderColor, gap: 10,
  },
  colors: { flexDirection: "row", gap: 10, flex: 1 },
  colorCircle: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.2)",
  },
  colorCirclePressed: { opacity: 0.6, transform: [{ scale: 0.9 }] },
  divider: { width: 1, height: 28, backgroundColor: THEME.colors.borderColor },
  removeButton: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, backgroundColor: "rgba(255, 68, 68, 0.1)",
  },
  removeButtonPressed: { opacity: 0.7 },
  removeText: { fontSize: 13, fontWeight: "600", color: "#ff4444" },
  removePlaceholder: { minWidth: 60 },
  closeButton: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  closeButtonPressed: { opacity: 0.7, backgroundColor: THEME.colors.thirdColor },
})
