import { View, Text, StyleSheet } from "react-native"
import { THEME } from "@/shared/lib/theme"
import type { LucideIcon } from "lucide-react-native"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  subtitle?: string
}

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {Icon && (
        <View style={styles.iconWrapper}>
          <Icon size={48} color={THEME.colors.fontColorText} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.thirdColor,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: THEME.colors.fontColorTitle,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: THEME.colors.fontColorText,
    textAlign: "center",
    lineHeight: 22,
  },
})
