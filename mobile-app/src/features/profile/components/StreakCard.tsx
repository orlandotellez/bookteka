import { useState, useEffect, useCallback } from "react"
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native"
import { Flame, Check, Settings } from "lucide-react-native"
import { THEME } from "@/shared/lib/theme"
import { useStreakStore } from "@/shared/store/streakStore"

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "No iniciada"
  try {
    const clean = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr
    const parts = clean.split("-")
    if (parts.length === 3) {
      const [year, month, day] = parts
      return `${day}/${month}/${year}`
    }
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) return date.toLocaleDateString("es-ES")
  } catch { return "No iniciada" }
  return "No iniciada"
}

function getTodayFormatted(): string {
  return new Date().toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long",
  })
}

export function StreakCard() {
  const { streakData, isStreakLoading, loadStreakData, completeDay, initializeStreak } = useStreakStore()
  const [showSettings, setShowSettings] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => { loadStreakData() }, [loadStreakData])

  const handleCompleteDay = useCallback(async () => {
    if (isCompleting || streakData?.hasCompletedToday) return
    setIsCompleting(true)
    try { await completeDay() }
    finally { setIsCompleting(false) }
  }, [completeDay, isCompleting, streakData?.hasCompletedToday])

  const handleInitialize = useCallback(async () => {
    if (!startDate) return
    await initializeStreak(0, startDate)
    setShowSettings(false)
    setStartDate("")
  }, [initializeStreak, startDate])

  const hasCompletedToday = streakData?.hasCompletedToday ?? false
  const currentStreak = streakData?.currentStreak ?? 0

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.streakDisplay}>
          <View style={styles.flameWrapper}>
            <Flame size={32} color={currentStreak > 0 ? THEME.colors.secondaryColor : THEME.colors.fontColorText} />
          </View>
          <View style={styles.streakInfo}>
            <Text style={styles.streakNumber}>{currentStreak}</Text>
            <Text style={styles.streakLabel}>días de racha</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          onPress={() => setShowSettings((v) => !v)} hitSlop={8}
        >
          <Settings size={16} color={THEME.colors.fontColorText} />
        </Pressable>
      </View>

      <Text style={styles.todayText}>Hoy: {getTodayFormatted()}</Text>
      <Text style={styles.startDate}>Inicio: {formatDate(streakData?.startDate)}</Text>

      <Pressable
        style={({ pressed }) => [
          styles.completeButton,
          hasCompletedToday && styles.completeButtonDone,
          pressed && !hasCompletedToday && styles.completeButtonPressed,
          (isCompleting || isStreakLoading) && styles.completeButtonLoading,
        ]}
        onPress={handleCompleteDay}
        disabled={hasCompletedToday || isCompleting || isStreakLoading}
      >
        {isCompleting || isStreakLoading ? (
          <ActivityIndicator size="small" color={hasCompletedToday ? THEME.colors.secondaryColor : "#fff"} />
        ) : hasCompletedToday ? (
          <>
            <Check size={18} color={THEME.colors.secondaryColor} />
            <Text style={styles.completeButtonTextDone}>¡Día completado!</Text>
          </>
        ) : (
          <>
            <Flame size={18} color="#fff" />
            <Text style={styles.completeButtonText}>Completar día</Text>
          </>
        )}
      </Pressable>

      {showSettings && (
        <View style={styles.settingsPopover}>
          <Text style={styles.settingsLabel}>Fecha de inicio de la racha</Text>
          <Pressable style={styles.dateInput} onPress={() => {}}>
            <Text style={styles.dateInputText}>{startDate || "Seleccionar fecha..."}</Text>
          </Pressable>
          <Text style={styles.settingsHint}>Selecciona desde qué día empezaste a leer consistentemente</Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={handleInitialize}
          >
            <Text style={styles.primaryButtonText}>Establecer racha</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.cardColor, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: THEME.colors.borderColor, gap: 12,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  streakDisplay: { flexDirection: "row", alignItems: "center", gap: 12 },
  flameWrapper: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center", alignItems: "center",
  },
  streakInfo: { gap: 2 },
  streakNumber: {
    fontSize: 36, fontWeight: "800", color: THEME.colors.fontColorTitle,
    fontVariant: ["tabular-nums"], lineHeight: 40,
  },
  streakLabel: { fontSize: 14, fontWeight: "600", color: THEME.colors.fontColorText },
  iconButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center", alignItems: "center",
  },
  iconButtonPressed: { opacity: 0.7 },
  todayText: { fontSize: 13, color: THEME.colors.fontColorText, textTransform: "capitalize" },
  startDate: { fontSize: 12, color: THEME.colors.fontColorText, opacity: 0.8 },
  completeButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: THEME.colors.secondaryColor, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 20,
  },
  completeButtonDone: {
    backgroundColor: THEME.colors.thirdColor,
    borderWidth: 1.5, borderColor: THEME.colors.secondaryColor,
  },
  completeButtonPressed: { opacity: 0.85 },
  completeButtonLoading: { opacity: 0.7 },
  completeButtonText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  completeButtonTextDone: { fontSize: 15, fontWeight: "600", color: THEME.colors.secondaryColor },
  settingsPopover: {
    backgroundColor: THEME.colors.thirdColor, borderRadius: 10,
    padding: 14, gap: 10,
  },
  settingsLabel: { fontSize: 13, fontWeight: "600", color: THEME.colors.fontColorTitle },
  dateInput: {
    backgroundColor: THEME.colors.cardColor, borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: THEME.colors.borderColor,
  },
  dateInputText: { fontSize: 14, color: THEME.colors.fontColorText },
  settingsHint: { fontSize: 12, color: THEME.colors.fontColorText, opacity: 0.8 },
  primaryButton: {
    backgroundColor: THEME.colors.secondaryColor, borderRadius: 8,
    paddingVertical: 10, alignItems: "center",
  },
  primaryButtonPressed: { opacity: 0.85 },
  primaryButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
})
