import { useState } from "react"
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native"
import { ChevronDown } from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"
import { Modal } from "@/components/common"

export type FilterStatus = "all" | "reading" | "unstarted" | "completed"
export type SortBy = "recent" | "name_asc" | "name_desc" | "time_desc"

export const FILTER_LABELS: Record<FilterStatus, string> = {
  all: "Todos",
  reading: "Leyendo",
  unstarted: "Sin empezar",
  completed: "Completado",
}

export const SORT_LABELS: Record<SortBy, string> = {
  recent: "Recientes",
  name_asc: "Nombre A-Z",
  name_desc: "Nombre Z-A",
  time_desc: "Más tiempo",
}

export const FILTER_KEYS = Object.keys(FILTER_LABELS) as FilterStatus[]
export const SORT_KEYS = Object.keys(SORT_LABELS) as SortBy[]

interface FilterBookProps {
  filterStatus: FilterStatus
  onFilterChange: (status: FilterStatus) => void
  sortBy: SortBy
  onSortChange: (sort: SortBy) => void
}

export function FilterBook({
  filterStatus,
  onFilterChange,
  sortBy,
  onSortChange,
}: FilterBookProps) {
  const [showSortPicker, setShowSortPicker] = useState(false)

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTER_KEYS.map((key) => (
          <Pressable
            key={key}
            onPress={() => onFilterChange(key)}
            style={[styles.filterChip, filterStatus === key && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filterStatus === key && styles.filterChipTextActive]}>
              {FILTER_LABELS[key]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable onPress={() => setShowSortPicker(true)} style={styles.sortButton}>
        <Text style={styles.sortButtonText} numberOfLines={1}>{SORT_LABELS[sortBy]}</Text>
        <ChevronDown size={14} color={THEME.colors.fontColorText} />
      </Pressable>

      <Modal
        visible={showSortPicker}
        title="Ordenar por"
        onClose={() => setShowSortPicker(false)}
      >
        <View style={styles.sortList}>
          {SORT_KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => { onSortChange(key); setShowSortPicker(false) }}
              style={[styles.sortItem, sortBy === key && styles.sortItemActive]}
            >
              <Text style={[styles.sortItemText, sortBy === key && styles.sortItemTextActive]}>
                {SORT_LABELS[key]}
              </Text>
              {sortBy === key && <View style={styles.sortCheck} />}
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: THEME.colors.fourColor,
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.secondaryColor,
    borderColor: THEME.colors.secondaryColor,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: THEME.colors.fontColorText,
  },
  filterChipTextActive: { color: "#fff" },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: THEME.colors.fourColor,
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
    maxWidth: 130,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: THEME.colors.fontColorText,
  },
  sortList: { gap: 2, paddingVertical: 4 },
  sortItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  sortItemActive: { backgroundColor: THEME.colors.thirdColor },
  sortItemText: {
    fontSize: 15,
    fontWeight: "500",
    color: THEME.colors.fontColorTitle,
  },
  sortItemTextActive: {
    color: THEME.colors.secondaryColor,
    fontWeight: "600",
  },
  sortCheck: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.secondaryColor,
  },
})
