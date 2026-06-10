import { Pressable, Text, View, StyleSheet, Platform } from "react-native"
import { ArrowLeft, Bookmark } from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"

import { ReadingTimer } from "./ReadingTimer"

interface ReaderHeaderProps {
  bookName: string
  bookmarksCount: number
  isRunning: boolean
  sessionSeconds: number
  onToggleTimer: () => void
  onBack: () => void
  onBookmarksPress: () => void
}

export function ReaderHeader({
  bookName,
  bookmarksCount,
  isRunning,
  sessionSeconds,
  onToggleTimer,
  onBack,
  onBookmarksPress,
}: ReaderHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        style={({ pressed }) => [
          styles.headerButton,
          pressed && styles.headerButtonPressed,
        ]}
        onPress={onBack}
        hitSlop={8}
        accessibilityLabel="Volver"
        accessibilityRole="button"
      >
        <ArrowLeft size={22} color={THEME.colors.fontColorTitle} />
      </Pressable>

      <Text style={styles.headerTitle} numberOfLines={1}>
        {bookName}
      </Text>

      <View style={styles.headerRight}>
        {/* Bookmark button with count badge */}
        <Pressable
          style={({ pressed }) => [
            styles.bookmarkHeaderButton,
            pressed && styles.headerButtonPressed,
          ]}
          onPress={onBookmarksPress}
          hitSlop={8}
          accessibilityLabel="Marcadores"
          accessibilityRole="button"
        >
          <Bookmark size={18} color={THEME.colors.fontColorTitle} />
          {bookmarksCount > 0 && (
            <View style={styles.bookmarkBadge}>
              <Text style={styles.bookmarkBadgeText}>
                {bookmarksCount > 9 ? "9+" : bookmarksCount}
              </Text>
            </View>
          )}
        </Pressable>

        <ReadingTimer
          isRunning={isRunning}
          sessionSeconds={sessionSeconds}
          onToggle={onToggleTimer}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 56 : 12,
    paddingBottom: 10,
    backgroundColor: THEME.colors.primaryColor,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderColor,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  headerButtonPressed: {
    backgroundColor: THEME.colors.thirdColor,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: THEME.colors.fontColorTitle,
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bookmarkHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  bookmarkBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: THEME.colors.secondaryColor,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  bookmarkBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
  },
})
