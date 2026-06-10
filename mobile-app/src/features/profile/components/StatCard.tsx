import { View, Text, StyleSheet } from "react-native"
import { THEME } from "@/shared/lib/theme"
import type { LucideIcon } from "lucide-react-native"

interface StatCardProps {
  icon: LucideIcon
  iconColor?: string
  value: string
  label: string
}

export function StatCard({ icon: Icon, iconColor, value, label }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrapper}>
        <Icon size={20} color={iconColor ?? THEME.colors.secondaryColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: THEME.colors.cardColor,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
    gap: 4,
  },
  iconWrapper: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center", alignItems: "center",
    marginBottom: 4,
  },
  value: {
    fontSize: 22, fontWeight: "700",
    color: THEME.colors.fontColorTitle,
    fontVariant: ["tabular-nums"],
  },
  label: {
    fontSize: 12, color: THEME.colors.fontColorText,
    textAlign: "center", textTransform: "uppercase",
    letterSpacing: 0.5,
  },
})
