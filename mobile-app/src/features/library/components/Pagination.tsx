import { View, Text, Pressable, StyleSheet } from "react-native"
import { THEME } from "@/shared/lib/theme"
import { Spinner } from "@/components/common"

interface PaginationProps {
  visibleCount: number
  totalCount: number
  hasMore: boolean
  onLoadMore: () => void
  isLoading?: boolean
}

export function Pagination({
  visibleCount,
  totalCount,
  hasMore,
  onLoadMore,
  isLoading = false,
}: PaginationProps) {
  if (totalCount === 0) return null

  return (
    <View style={styles.container}>
      <Text style={styles.info}>
        Mostrando{" "}
        <Text style={styles.infoHighlight}>
          {Math.min(visibleCount, totalCount)}
        </Text>{" "}
        de <Text style={styles.infoHighlight}>{totalCount}</Text> libros
      </Text>

      {hasMore && (
        <Pressable
          onPress={onLoadMore}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.loadMoreButton,
            pressed && styles.loadMorePressed,
            isLoading && styles.loadMoreDisabled,
          ]}
        >
          {isLoading ? (
            <Spinner size="small" color={THEME.colors.secondaryColor} />
          ) : (
            <Text style={styles.loadMoreText}>Cargar más</Text>
          )}
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  info: {
    fontSize: 13,
    color: THEME.colors.fontColorText,
    textAlign: "center",
  },
  infoHighlight: {
    fontWeight: "700",
    color: THEME.colors.fontColorTitle,
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: THEME.colors.thirdColor,
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
    minWidth: 140,
    minHeight: 40,
  },
  loadMorePressed: {
    opacity: 0.8,
  },
  loadMoreDisabled: {
    opacity: 0.6,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.colors.fontColorTitle,
  },
})
