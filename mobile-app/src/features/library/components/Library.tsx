import { useState, useEffect, useMemo, useCallback } from "react"
import {
  View, Text, TextInput, Pressable, RefreshControl,
  ScrollView, Alert, StyleSheet,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Book as BookIcon, Search, Grid, Menu, Plus } from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"
import { useBookStore } from "@/shared/store/bookStore"
import type { Book } from "@/shared/types/book"
import { normalizeText } from "@/utils/text"
import { BookGrid } from "./BookGrid"
import { BookList } from "./BookList"
import { FilterBook, type FilterStatus, type SortBy } from "./FilterBook"
import { PDFUploader } from "./PDFUploader"
import { EmptyState, Loading } from "@/components/common"

type ViewMode = "grid" | "list"
const ITEMS_PER_PAGE = 6

export function Library() {
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [sortBy, setSortBy] = useState<SortBy>("recent")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [refreshing, setRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showUploader, setShowUploader] = useState(false)

  const { books, isLoading, loadBooks, deleteBook, getBookById, setCurrentBook, setCurrentView, syncBookToCloud } = useBookStore()

  useEffect(() => { loadBooks() }, [])

  // reset pagination on filter change
  useEffect(() => { setCurrentPage(1) }, [searchQuery, filterStatus, sortBy])

  const handleOpenBook = useCallback(async (book: Book) => {
    const freshBook = await getBookById(book.id)
    if (freshBook) {
      setCurrentBook(freshBook)
      setCurrentView("reader")
      router.push(`/reader/${book.id}`)
    }
  }, [getBookById, setCurrentBook, setCurrentView, router])

  const handleDelete = useCallback(async (id: string) => {
    try { await deleteBook(id) }
    catch (err) { console.error("Error deleting book:", err) }
  }, [deleteBook])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    setCurrentPage(1)
    await loadBooks()
    setRefreshing(false)
  }, [loadBooks])

  const handleUploadComplete = useCallback(() => {
    setCurrentPage(1)
  }, [])

  const handleSyncPress = useCallback(async (book: Book) => {
    try {
      await syncBookToCloud(book.id)
      await loadBooks()
      Alert.alert("Sincronizado", `"${book.name.replace(/\.pdf$/i, "")}" se ha sincronizado correctamente.`)
    } catch (error) {
      Alert.alert("Error", `No se pudo sincronizar "${book.name.replace(/\.pdf$/i, "")}". Verifica tu conexión.`)
    }
  }, [syncBookToCloud, loadBooks])

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore) return
    setIsLoadingMore(true)
    requestAnimationFrame(() => {
      setCurrentPage((p) => p + 1)
      setIsLoadingMore(false)
    })
  }, [isLoadingMore])

  // filter + sort
  const processedBooks = useMemo(() => {
    let filtered = [...books]
    if (searchQuery.trim()) {
      const q = normalizeText(searchQuery)
      filtered = filtered.filter((b) => normalizeText(b.name).includes(q))
    }
    if (filterStatus === "reading") {
      filtered = filtered.filter((b) => (b.scrollPosition ?? 0) > 0)
    } else if (filterStatus === "unstarted") {
      filtered = filtered.filter((b) => (b.scrollPosition ?? 0) === 0)
    } else if (filterStatus === "completed") {
      filtered = filtered.filter((b) => b.totalPages != null && b.totalPages > 0 && (b.scrollPosition ?? 0) >= b.totalPages)
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "recent": return b.lastReadAt - a.lastReadAt
        case "name_asc": return a.name.localeCompare(b.name)
        case "name_desc": return b.name.localeCompare(a.name)
        case "time_desc": return (b.readingTimeSeconds ?? 0) - (a.readingTimeSeconds ?? 0)
        default: return 0
      }
    })
    return filtered
  }, [books, searchQuery, filterStatus, sortBy])

  const visibleBooks = useMemo(
    () => processedBooks.slice(0, currentPage * ITEMS_PER_PAGE),
    [processedBooks, currentPage],
  )
  const hasMore = visibleBooks.length < processedBooks.length

  if (isLoading && books.length === 0) return <Loading text="Cargando libros..." />

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Librería</Text>
          <Text style={styles.subtitle}>
            {books.length > 0
              ? `${books.length} libro${books.length !== 1 ? "s" : ""} en tu biblioteca`
              : "Tu biblioteca personal"}
          </Text>
        </View>

        {books.length > 0 && (
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={18} color={THEME.colors.fontColorText} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar libros..."
                placeholderTextColor={THEME.colors.fontColorText}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
        )}

        {books.length > 0 && (
          <View style={styles.toolbar}>
            <View style={styles.filterSortRow}>
              <FilterBook filterStatus={filterStatus} onFilterChange={setFilterStatus} sortBy={sortBy} onSortChange={setSortBy} />
            </View>
            <View style={styles.viewToggle}>
              <Pressable
                onPress={() => setViewMode("grid")}
                style={[styles.viewButton, styles.viewButtonFirst, viewMode === "grid" && styles.viewButtonActive]}
              >
                <Grid size={16} color={viewMode === "grid" ? THEME.colors.secondaryColor : THEME.colors.fontColorText} />
              </Pressable>
              <Pressable
                onPress={() => setViewMode("list")}
                style={[styles.viewButton, styles.viewButtonLast, viewMode === "list" && styles.viewButtonActive]}
              >
                <Menu size={16} color={viewMode === "list" ? THEME.colors.secondaryColor : THEME.colors.fontColorText} />
              </Pressable>
            </View>
          </View>
        )}

        {books.length > 0 ? (
          viewMode === "grid" ? (
            <BookGrid
              books={visibleBooks} isLoading={false}
              onOpen={handleOpenBook} onDelete={handleDelete} onSyncPress={handleSyncPress}
              refreshing={refreshing} onRefresh={handleRefresh}
              pagination={{ visibleCount: visibleBooks.length, totalCount: processedBooks.length, hasMore, onLoadMore: handleLoadMore, isLoadingMore }}
            />
          ) : (
            <BookList
              books={visibleBooks} isLoading={false}
              onOpen={handleOpenBook} onDelete={handleDelete} onSyncPress={handleSyncPress}
              refreshing={refreshing} onRefresh={handleRefresh}
              pagination={{ visibleCount: visibleBooks.length, totalCount: processedBooks.length, hasMore, onLoadMore: handleLoadMore, isLoadingMore }}
            />
          )
        ) : (
          <ScrollView
            contentContainerStyle={styles.emptyScroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.colors.secondaryColor} />}
          >
            <EmptyState icon={BookIcon} title="Tu biblioteca está vacía" subtitle="Sube tu primer libro para comenzar a leer" />
          </ScrollView>
        )}

        <PDFUploader visible={showUploader} onClose={() => setShowUploader(false)} onUploadComplete={handleUploadComplete} />

        <Pressable onPress={() => setShowUploader(true)} style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
          <Plus size={24} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.colors.primaryColor },
  container: { flex: 1, backgroundColor: THEME.colors.primaryColor },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 32, fontWeight: "700", color: THEME.colors.fontColorTitle },
  subtitle: { fontSize: 15, color: THEME.colors.fontColorText, marginTop: 4 },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: THEME.colors.fourColor, borderRadius: 12,
    paddingHorizontal: 14, gap: 10,
    borderWidth: 1, borderColor: THEME.colors.borderColor,
  },
  searchInput: {
    flex: 1, paddingVertical: 12, fontSize: 16, color: THEME.colors.fontColorTitle,
  },
  toolbar: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 16,
    paddingBottom: 12, gap: 8,
  },
  filterSortRow: { flex: 1, flexShrink: 1 },
  viewToggle: {
    flexDirection: "row",
    borderWidth: 1, borderColor: THEME.colors.borderColor,
    borderRadius: 8, overflow: "hidden",
  },
  viewButton: {
    paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: THEME.colors.fourColor,
  },
  viewButtonFirst: { borderRightWidth: 0.5, borderRightColor: THEME.colors.borderColor },
  viewButtonLast: { borderLeftWidth: 0.5, borderLeftColor: THEME.colors.borderColor },
  viewButtonActive: { backgroundColor: THEME.colors.thirdColor },
  emptyScroll: { flexGrow: 1, justifyContent: "center" },
  fab: {
    position: "absolute", right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: THEME.colors.secondaryColor,
    justifyContent: "center", alignItems: "center",
    elevation: 6, shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.95 }] },
})
