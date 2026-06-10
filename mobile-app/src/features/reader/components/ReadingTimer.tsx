import { Pressable, Text, View, StyleSheet } from "react-native"
import { Play, Pause } from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"
import { formatTimeShort } from "@/utils/time"

interface ReadingTimerProps {
  isRunning: boolean
  sessionSeconds: number
  onToggle: () => void
}

export function ReadingTimer({ isRunning, sessionSeconds, onToggle }: ReadingTimerProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.toggleButton, pressed && styles.toggleButtonPressed]}
        onPress={onToggle} hitSlop={8}
      >
        {isRunning ? (
          <Pause size={14} color={THEME.colors.fontColorTitle} />
        ) : (
          <Play size={14} color={THEME.colors.fontColorTitle} />
        )}
      </Pressable>
      <Text style={[styles.time, isRunning ? styles.timeRunning : styles.timePaused]}>
        {formatTimeShort(sessionSeconds)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 6 },
  toggleButton: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center", alignItems: "center",
  },
  toggleButtonPressed: { opacity: 0.7 },
  time: {
    fontSize: 13, fontWeight: "600",
    fontVariant: ["tabular-nums"], minWidth: 40,
  },
  timeRunning: { color: THEME.colors.fontColorTitle },
  timePaused: { color: THEME.colors.fontColorText },
})
