import { useState, useEffect, useCallback, useMemo } from "react"
import {
  View, Text, ScrollView, Pressable,
  ActivityIndicator, Alert, StyleSheet,
} from "react-native"
import {
  User, Clock, BookOpen, TrendingUp,
  Bookmark, Flame, Cloud, CloudOff, LogOut,
} from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"
import { CloudSyncToggle } from "@/components/common/CloudSyncToggle"
import { useBookStore } from "@/shared/store/bookStore"
import { useStreakStore } from "@/shared/store/streakStore"
import { getSession, signOut } from "@/shared/lib/auth"
import { clearDatabase } from "@/shared/database"
import { getAllBookmarks } from "@/shared/database"
import { formatTime } from "@/utils/time"
import { StatCard } from "./StatCard"
import { StreakCard } from "./StreakCard"
import { ReadingSettingsCard } from "./ReadingSettingsCard"
import type { SessionData } from "@/shared/lib/auth"
import { router } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"

export function UserProfile() {
  const [session, setSession] = useState<SessionData | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const { books, loadBooks } = useBookStore()
  const { streakData } = useStreakStore()
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const sessionData = await getSession()
        setSession(sessionData)
      } catch (err) {
        console.error("Error loading session:", err)
      } finally {
        setIsSessionLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => { loadBooks() }, [loadBooks])

  useEffect(() => {
    async function loadBookmarkCount() {
      try {
        const allBookmarks = await getAllBookmarks()
        setBookmarkCount(allBookmarks.length)
      } catch (err) {
        console.error("Error loading bookmarks:", err)
      }
    }
    loadBookmarkCount()
  }, [books])

  const totalReadingTime = useMemo(
    () => books.reduce((acc, b) => acc + (b.readingTimeSeconds || 0), 0),
    [books],
  )
  const totalBooks = books.length
  const currentStreak = streakData?.currentStreak ?? 0

  const sortedBooks = useMemo(
    () => [...books].sort((a, b) => (b.readingTimeSeconds ?? 0) - (a.readingTimeSeconds ?? 0)),
    [books],
  )

  const handleSignOut = useCallback(() => {
    Alert.alert("Cerrar sesión", "¿Estás seguro de que quieres cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión", style: "destructive",
        onPress: async () => {
          setIsSigningOut(true)
          try {
            await signOut()
            await clearDatabase()
            router.replace("/(auth)/login")
          } catch (error) {
            console.error("Error al cerrar sesión:", error)
            setIsSigningOut(false)
          }
        },
      },
    ])
  }, [router])

  const userInitial = session?.user?.name?.charAt(0).toUpperCase() || "U"

  const statCards = [
    { icon: Clock, iconColor: THEME.colors.secondaryColor, label: "Tiempo total", value: formatTime(totalReadingTime) },
    { icon: BookOpen, iconColor: "#4ade80", label: "Libros", value: totalBooks.toString() },
    { icon: Flame, iconColor: THEME.colors.secondaryColor, label: "Racha actual", value: `${currentStreak} días` },
    { icon: Bookmark, iconColor: "#5ea2f5", label: "Marcadores", value: bookmarkCount.toString() },
  ]

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <Text style={styles.headerSubtitle}>Estadísticas de lectura</Text>
        </View>

        <View style={styles.userCard}>
          <View style={styles.userRow}>
            {isSessionLoading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator size="small" color={THEME.colors.fontColorText} />
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                {session?.user?.image ? (
                  <Text style={styles.avatarInitial}>{userInitial}</Text>
                ) : (
                  <User size={24} color={THEME.colors.secondaryColor} />
                )}
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {isSessionLoading ? "Cargando..." : session?.user?.name || "Usuario"}
              </Text>
              <Text style={styles.userEmail}>{session?.user?.email || ""}</Text>
              {session?.user?.emailVerified ? (
                <Text style={styles.verifiedBadge}>✓ Email Verificado</Text>
              ) : session?.user?.email ? (
                <Text style={styles.unverifiedBadge}>⚠ Email sin verificar</Text>
              ) : null}
            </View>
          </View>
        </View>

        <StreakCard />

        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <StatCard key={index} icon={stat.icon} iconColor={stat.iconColor} label={stat.label} value={stat.value} />
          ))}
        </View>

        <ReadingSettingsCard />

        <View><CloudSyncToggle /></View>

        {sortedBooks.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <TrendingUp size={16} color={THEME.colors.fontColorTitle} />
              <Text style={styles.sectionTitle}>Todos los libros</Text>
            </View>
            <View style={styles.bookList}>
              {sortedBooks.map((book, index) => (
                <View key={book.id} style={styles.bookRow}>
                  <Text style={styles.bookIndex}>{index + 1}</Text>
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookName} numberOfLines={1}>
                      {book.name.replace(/\.pdf$/i, "")}
                    </Text>
                  </View>
                  <Text style={styles.bookTime}>{formatTime(book.readingTimeSeconds ?? 0)}</Text>
                  <View style={styles.syncDot}>
                    {book.isSynced ? (
                      <Cloud size={12} color={THEME.colors.secondaryColor} />
                    ) : (
                      <CloudOff size={12} color={THEME.colors.fontColorText} />
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {sortedBooks.length === 0 && (
          <View style={styles.emptySection}>
            <BookOpen size={32} color={THEME.colors.fontColorText} />
            <Text style={styles.emptyText}>Aún no tienes libros. ¡Añade uno para empezar!</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed, isSigningOut && styles.signOutButtonDisabled]}
          onPress={handleSignOut} disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#ef4444" size="small" />
          ) : (
            <>
              <LogOut size={18} color="#ef4444" />
              <Text style={styles.signOutText}>Cerrar Sesión</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.colors.primaryColor },
  container: { flex: 1, backgroundColor: THEME.colors.primaryColor, paddingInline: 24, paddingTop: 16 },
  contentContainer: { paddingBottom: 40, gap: 16 },
  header: { paddingBottom: 8 },
  headerTitle: { fontSize: 32, fontWeight: "700", color: THEME.colors.fontColorTitle },
  headerSubtitle: { fontSize: 14, color: THEME.colors.fontColorText, marginTop: 4 },
  userCard: {
    backgroundColor: THEME.colors.cardColor, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: THEME.colors.borderColor,
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center", alignItems: "center",
  },
  avatarInitial: { fontSize: 20, fontWeight: "700", color: THEME.colors.secondaryColor },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 18, fontWeight: "700", color: THEME.colors.fontColorTitle },
  userEmail: { fontSize: 13, color: THEME.colors.fontColorText },
  verifiedBadge: { fontSize: 12, color: "#4ade80", fontWeight: "600", marginTop: 2 },
  unverifiedBadge: { fontSize: 12, color: "#fbbf24", fontWeight: "600", marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: THEME.colors.fontColorTitle },
  bookList: {
    backgroundColor: THEME.colors.cardColor, borderRadius: 12,
    borderWidth: 1, borderColor: THEME.colors.borderColor, overflow: "hidden",
  },
  bookRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.borderColor, gap: 10,
  },
  bookIndex: {
    fontSize: 13, fontWeight: "600", color: THEME.colors.fontColorText, minWidth: 20,
  },
  bookInfo: { flex: 1 },
  bookName: { fontSize: 14, fontWeight: "600", color: THEME.colors.fontColorTitle },
  bookTime: {
    fontSize: 12, color: THEME.colors.fontColorText,
    fontVariant: ["tabular-nums"], minWidth: 60, textAlign: "right",
  },
  syncDot: { width: 24, alignItems: "center" },
  emptySection: { paddingVertical: 40, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, color: THEME.colors.fontColorText, textAlign: "center" },
  signOutButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: THEME.colors.cardColor, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: "#ef4444", minHeight: 52,
  },
  signOutButtonPressed: { opacity: 0.85 },
  signOutButtonDisabled: { opacity: 0.5 },
  signOutText: { color: "#ef4444", fontSize: 16, fontWeight: "600" },
})
