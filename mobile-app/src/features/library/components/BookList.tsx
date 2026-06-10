import { FlatList, RefreshControl, StyleSheet } from "react-native"
import { THEME } from "@/shared/lib/theme"
import type { Book } from "@/shared/types/book"
import { CardBookList } from "./CardBookList"
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

interface BookListProps {
  books: Book[]
  isLoading: boolean
  onOpen: (book: Book) => void
  onDelete: (id: string) => void
  onSyncPress?: (book: Book) => void
  refreshing?: boolean
  onRefresh?: () => void
  pagination?: PaginationInfo
}

export function BookList({
  books,
  isLoading,
  onOpen,
  onDelete,
  onSyncPress,
  refreshing = false,
  onRefresh,
  pagination,
}: BookListProps) {
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
      contentContainerStyle={styles.list}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.secondaryColor} />
        ) : undefined
      }
      renderItem={({ item }) => (
        <CardBookList book={item} onOpen={onOpen} onDelete={onDelete} onSyncPress={onSyncPress} />
      )}
      ItemSeparatorComponent={() => <></>}
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
    gap: 10,
  },
})
