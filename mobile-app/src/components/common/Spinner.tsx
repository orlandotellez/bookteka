import { ActivityIndicator, View, StyleSheet } from "react-native"
import { THEME } from "@/shared/lib/theme"

interface SpinnerProps {
  size?: "small" | "large"
  color?: string
}

export function Spinner({ size = "small", color }: SpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator
        size={size}
        color={color ?? THEME.colors.secondaryColor}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
})
