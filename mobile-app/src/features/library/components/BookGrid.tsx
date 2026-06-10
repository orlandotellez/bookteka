import { FlatList, RefreshControl, StyleSheet, View } from "react-native"
import { THEME } from "@/shared/lib/theme"
import type { Book } from "@/shared/types/book"
import { CardBook } from "./CardBook"
import { Loading, EmptyState } from "@/components/common"
import { Pagination } from "./Pagination"
import { Book as BookIcon } from "lucide-react-native"

interface PaginationInfo {
  visibleCount: number
  totalCount: number
  hasMore: boolean
  onLoadMore: () => void
  isLoadingMore?: boolean
}

interface BookGridProps {
  books: Book[]
  isLoading: boolean
  onOpen: (book: Book) => void
  onDelete: (id: string) => void
  onSyncPress?: (book: Book) => void
  refreshing?: boolean
  onRefresh?: () => void
  pagination?: PaginationInfo
}

const NUM_COLUMNS = 2

export function BookGrid({
  books,
  isLoading,
  onOpen,
  onDelete,
  onSyncPress,
  refreshing = false,
  onRefresh,
  pagination,
}: BookGridProps) {
  if (isLoading) return <Loading text="Cargando libros..." />

  if (books.length === 0) {
    return (
      <EmptyState
        icon={BookIcon}
        title="Tu biblioteca está vacía"
        subtitle="Sube tu primer libro para comenzar a leer"
      />
    )
  }

  return (
    <FlatList
      data={books}
      keyExtractor={(item) => item.id}
      numColumns={NUM_COLUMNS}
      contentContainerStyle={styles.list}
      columnWrapperStyle={styles.row}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.secondaryColor} />
        ) : undefined
      }
      renderItem={({ item }) => (
        <View style={styles.itemWrapper}>
          <CardBook book={item} onOpen={onOpen} onDelete={onDelete} onSyncPress={onSyncPress} />
        </View>
      )}
      ListFooterComponent={
        pagination && pagination.totalCount > 0 ? (
          <Pagination
            visibleCount={pagination.visibleCount}
            totalCount={pagination.totalCount}
            hasMore={pagination.hasMore}
            onLoadMore={pagination.onLoadMore}
            isLoading={pagination.isLoadingMore}
          />
        ) : undefined
      }
      onEndReached={pagination?.hasMore ? pagination.onLoadMore : undefined}
      onEndReachedThreshold={0.5}
    />
  )
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  row: { gap: 12 },
  itemWrapper: { flex: 1, maxWidth: "50%" },
})
