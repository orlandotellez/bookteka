import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native"
import { THEME } from "@/shared/lib/theme"
import type { LucideIcon } from "lucide-react-native"

type ButtonVariant = "primary" | "secondary" | "outline" | "danger"

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: ButtonVariant
  loading?: boolean
  disabled?: boolean
  icon?: LucideIcon
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon: Icon,
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: getBackgroundColor(variant),
          borderWidth: variant === "outline" ? 1.5 : 0,
          borderColor: variant === "outline" ? THEME.colors.secondaryColor : "transparent",
        },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === "outline" ? THEME.colors.secondaryColor : "#fff"}
          />
        ) : (
          <>
            {Icon && <Icon size={18} color={getIconColor(variant)} style={styles.icon} />}
            <Text style={[styles.text, { color: getTextColor(variant) }]}>{title}</Text>
          </>
        )}
      </View>
    </Pressable>
  )
}

function getBackgroundColor(variant: ButtonVariant): string {
  switch (variant) {
    case "primary":
      return THEME.colors.secondaryColor
    case "secondary":
      return THEME.colors.thirdColor
    case "outline":
      return "transparent"
    case "danger":
      return "#dc3545"
    default:
      return THEME.colors.secondaryColor
  }
}

function getTextColor(variant: ButtonVariant): string {
  switch (variant) {
    case "outline":
      return THEME.colors.secondaryColor
    default:
      return "#fff"
  }
}

function getIconColor(variant: ButtonVariant): string {
  switch (variant) {
    case "outline":
      return THEME.colors.secondaryColor
    case "danger":
      return "#fff"
    default:
      return "#fff"
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    opacity: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
})
