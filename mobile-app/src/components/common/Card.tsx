import { Pressable, View, StyleSheet } from "react-native"
import { THEME } from "@/shared/lib/theme"
import type { ReactNode } from "react"

interface CardProps {
  children: ReactNode
  onPress?: () => void
  style?: object
}

export function Card({ children, onPress, style }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    )
  }

  return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.cardColor,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.borderColor,
    // Shadow (Android)
    elevation: 2,
    // Shadow (iOS)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  pressed: {
    opacity: 0.85,
  },
})
